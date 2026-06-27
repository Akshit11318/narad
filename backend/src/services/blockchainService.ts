import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const idl = require("../voting_sys.json");

const WALLET_DIR = path.resolve(process.env.HOME || "/root", ".config/solana");
const WALLET_PATH = path.join(WALLET_DIR, "id.json");

function normalizeStage(stage: any): string {
  if (typeof stage === "string") return stage;
  if (stage && typeof stage === "object") {
    const keys = Object.keys(stage);
    if (keys.length > 0) return keys[0];
  }
  return "unknown";
}

function normalizeElection(pubKey: string, account: any) {
  return {
    id: pubKey,
    publicKey: pubKey,
    data: {
      stage: normalizeStage(account.stage),
      initiator: account.initiator ? account.initiator.toString() : "",
      totalVotes: account.totalVotes ? account.totalVotes.toString() : "0",
      totalCandidates: account.totalCandidates ? account.totalCandidates.toString() : "0",
      candidateWhitelist: account.candidateWhitelist || [],
      n: account.n || "",
      h: account.h || "",
      ska: account.ska || "",
      collectorPkc: account.collectorPkc || "",
      auxt: account.auxt || "",
    },
  };
}

export class BlockchainService {
  private connection: Connection;
  private provider: anchor.AnchorProvider;
  private program: Program<Idl>;
  private walletKeypair: Keypair;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "http://localhost:8899",
      "confirmed"
    );

    this.walletKeypair = this.loadOrCreateWallet();
    this.provider = new anchor.AnchorProvider(
      this.connection,
      new anchor.Wallet(this.walletKeypair),
      { commitment: "confirmed" }
    );
    anchor.setProvider(this.provider);
    this.program = new anchor.Program(idl as any, this.provider) as Program<any>;
    this.ensureWalletFunded();
  }

  private loadOrCreateWallet(): Keypair {
    try {
      if (fs.existsSync(WALLET_PATH)) {
        const secret = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
        console.log("[NARAD] Wallet loaded from", WALLET_PATH);
        return Keypair.fromSecretKey(Buffer.from(secret));
      }
    } catch (err) {
      console.warn("[NARAD] Failed to read wallet:", err);
    }

    console.log("[NARAD] Generating new wallet keypair...");
    const kp = Keypair.generate();
    fs.mkdirSync(WALLET_DIR, { recursive: true });
    fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(kp.secretKey)));
    console.log("[NARAD] Wallet saved to", WALLET_PATH);
    console.log("[NARAD] Wallet public key:", kp.publicKey.toBase58());
    return kp;
  }

  private async ensureWalletFunded() {
    try {
      const balance = await this.connection.getBalance(this.walletKeypair.publicKey);
      if (balance < LAMPORTS_PER_SOL) {
        console.log("[NARAD] Wallet balance is 0 SOL. Requesting airdrop...");
        const sig = await this.connection.requestAirdrop(
          this.walletKeypair.publicKey, 100 * LAMPORTS_PER_SOL
        );
        await this.connection.confirmTransaction(sig, "confirmed");
        const newBal = await this.connection.getBalance(this.walletKeypair.publicKey);
        console.log("[NARAD] Airdrop complete. Balance:", newBal / LAMPORTS_PER_SOL, "SOL");
      } else {
        console.log("[NARAD] Wallet balance:", balance / LAMPORTS_PER_SOL, "SOL");
      }
    } catch (err) {
      console.error("[NARAD] Airdrop failed:", err instanceof Error ? err.message : err);
    }
  }

  getWalletPublicKey(): string {
    return this.walletKeypair.publicKey.toBase58();
  }

  async createElection(totalVotes: number, totalCandidates: number) {
    const electionPDA = Keypair.generate();
    const tx = await this.program.methods
      .createElection(new anchor.BN(totalVotes), new anchor.BN(totalCandidates))
      .accounts({
        electionData: electionPDA.publicKey,
        signer: this.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([electionPDA])
      .rpc();

    return {
      success: true,
      electionId: electionPDA.publicKey.toString(),
      transaction: tx,
      publicKey: electionPDA.publicKey.toString(),
    };
  }

  async getAllElections() {
    const elections = await (this.program as any).account.electionData.all();
    return elections.map((e: any) => normalizeElection(e.publicKey.toString(), e.account));
  }

  async getElection(electionId: string) {
    const account = await (this.program as any).account.electionData.fetch(new PublicKey(electionId));
    return normalizeElection(electionId, account);
  }

  async changeElectionStage(electionId: string, stage: "application" | "voting" | "closed") {
    const stageMap: Record<string, any> = {
      application: { application: {} },
      voting: { voting: {} },
      closed: { closed: {} },
    };
    await this.program.methods
      .changeStage(stageMap[stage])
      .accounts({
        electionData: new PublicKey(electionId),
        initiator: this.provider.wallet.publicKey,
      })
      .rpc();
    return { success: true };
  }

  async getCandidates(electionId: string) {
    const account = await (this.program as any).account.electionData.fetch(new PublicKey(electionId));
    const candidates = account.candidateWhitelist || [];
    return candidates.map((name: string, index: number) => ({
      id: index + 1,
      name,
      party: "Independent",
      description: "Candidate for election " + electionId,
      photo: "/assets/candidate" + ((index % 4) + 1) + ".svg",
    }));
  }

  async addCandidate(electionId: string, candidateName: string) {
    await this.program.methods.addToCandidateWhitelist(candidateName).accounts({
      electionData: new PublicKey(electionId),
      initiator: this.provider.wallet.publicKey,
    }).rpc();
    return { success: true };
  }

  async removeCandidate(electionId: string, candidateName: string) {
    await this.program.methods.removeFromCandidateWhitelist(candidateName).accounts({
      electionData: new PublicKey(electionId),
      initiator: this.provider.wallet.publicKey,
    }).rpc();
    return { success: true };
  }

  async addSKA(electionId: string, ska: string) {
    await this.program.methods.addska(ska).accounts({
      electionData: new PublicKey(electionId),
      initiator: this.provider.wallet.publicKey,
    }).rpc();
    return { success: true };
  }

  async addAUXT(electionId: string, auxt: string) {
    await this.program.methods.addauxt(auxt).accounts({
      electionData: new PublicKey(electionId),
      initiator: this.provider.wallet.publicKey,
    }).rpc();
    return { success: true };
  }

  async addCollectorPKC(electionId: string, collectorPkc: string) {
    await this.program.methods.addcollectorpkc(collectorPkc).accounts({
      electionData: new PublicKey(electionId),
      initiator: this.provider.wallet.publicKey,
    }).rpc();
    return { success: true };
  }

  async submitVote(electionId: string, voterId: string, voterCi: string) {
    const electionPubkey = new PublicKey(electionId);
    const [voterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), electionPubkey.toBuffer(), Buffer.from(voterId)],
      this.program.programId
    );
    await this.program.methods.vote(voterId, voterCi).accounts({
      electionData: electionPubkey,
      voterData: voterAccount,
      signer: this.provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    return { success: true };
  }

  async getVoterStatus(electionId: string, voterId: string) {
    const [voterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), new PublicKey(electionId).toBuffer(), Buffer.from(voterId)],
      this.program.programId
    );
    try {
      const voterData = await (this.program as any).account.voterData.fetch(voterAccount);
      return { hasVoted: voterData.voted };
    } catch {
      return { hasVoted: false };
    }
  }

  async syncCollectorPKC(electionId: string, collectorPkc: string) {
    await this.program.methods.syncCollectorPkc(collectorPkc).accounts({
      electionData: new PublicKey(electionId),
      initiator: this.provider.wallet.publicKey,
    }).rpc();
    return { success: true };
  }
}

export const blockchainService = new BlockchainService();
