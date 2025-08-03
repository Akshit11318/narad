import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// Import the IDL
const idl = require("../../voting_sys.json");

export class BlockchainService {
  private connection: Connection;
  private provider: anchor.AnchorProvider;
  private program: Program<Idl>;
  private walletKeypair: Keypair;

  constructor() {
    // Initialize connection to Solana cluster
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "http://localhost:8899",
      "confirmed"
    );

    // Load wallet keypair
    const defaultWalletPath = path.resolve(
      process.env.HOME || "",
      ".config/solana/id.json"
    );

    try {
      this.walletKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(defaultWalletPath, "utf-8")))
      );
    } catch (error) {
      console.warn(
        "Could not load wallet from default path, using generated keypair"
      );
      this.walletKeypair = Keypair.generate();
    }

    // Initialize Anchor provider
    this.provider = new anchor.AnchorProvider(
      this.connection,
      new anchor.Wallet(this.walletKeypair),
      { commitment: "confirmed" }
    );
    anchor.setProvider(this.provider);

    // Initialize program
    this.program = new anchor.Program(
      idl as any,
      this.provider
    ) as Program<any>;
  }

  /**
   * Create a new election on the blockchain
   */
  async createElection(totalVotes: number, totalCandidates: number) {
    try {
      const electionPDA = Keypair.generate();

      const tx = await this.program.methods
        .createElection(
          new anchor.BN(totalVotes),
          new anchor.BN(totalCandidates)
        )
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
        publicKey: electionPDA.publicKey,
      };
    } catch (error) {
      console.error("Error creating election:", error);
      throw error;
    }
  }

  /**
   * Get all elections from the blockchain
   */
  async getAllElections() {
    try {
      const elections = await (this.program as any).account.electionData.all();
      return elections.map((election: any) => ({
        id: election.publicKey.toString(),
        publicKey: election.publicKey.toString(),
        data: election.account,
      }));
    } catch (error) {
      console.error("Error fetching elections:", error);
      throw error;
    }
  }

  /**
   * Get a specific election by ID
   */
  async getElection(electionId: string) {
    try {
      const electionAccount = await (
        this.program as any
      ).account.electionData.fetch(new PublicKey(electionId));
      return {
        id: electionId,
        data: electionAccount,
      };
    } catch (error) {
      console.error("Error fetching election:", error);
      throw error;
    }
  }

  /**
   * Change election stage
   */
  async changeElectionStage(
    electionId: string,
    stage: "application" | "voting" | "closed"
  ) {
    try {
      const stageMap = {
        application: { application: {} },
        voting: { voting: {} },
        closed: { closed: {} },
      };

      const stageValue = stageMap[stage];
      if (!stageValue) {
        throw new Error("Invalid election stage");
      }

      await this.program.methods
        .changeStage(stageValue)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error changing election stage:", error);
      throw error;
    }
  }

  /**
   * Get candidates for a specific election
   */
  async getCandidates(electionId: string) {
    try {
      const electionAccount = await (
        this.program as any
      ).account.electionData.fetch(new PublicKey(electionId));

      const candidates = electionAccount.candidateWhitelist || [];

      return candidates.map((candidateName: string, index: number) => ({
        id: index + 1,
        name: candidateName,
        party: "Independent", // Default party since blockchain only stores names
        description: `Candidate for election ${electionId}`,
        photo: `/assets/candidate${(index % 4) + 1}.svg`, // Cycle through available assets
      }));
    } catch (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }
  }

  /**
   * Add candidate to whitelist
   */
  async addCandidate(electionId: string, candidateName: string) {
    try {
      await this.program.methods
        .addToCandidateWhitelist(candidateName)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error adding candidate:", error);
      throw error;
    }
  }

  /**
   * Remove candidate from whitelist
   */
  async removeCandidate(electionId: string, candidateName: string) {
    try {
      await this.program.methods
        .removeFromCandidateWhitelist(candidateName)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error removing candidate:", error);
      throw error;
    }
  }

  /**
   * Add SKA to election
   */
  async addSKA(electionId: string, ska: string) {
    try {
      await this.program.methods
        .addska(ska)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error adding SKA:", error);
      throw error;
    }
  }

  /**
   * Add AUXT to election
   */
  async addAUXT(electionId: string, auxt: string) {
    try {
      await this.program.methods
        .addauxt(auxt)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error adding AUXT:", error);
      throw error;
    }
  }

  /**
   * Add collector public key to election
   */
  async addCollectorPKC(electionId: string, collectorPkc: string) {
    try {
      await this.program.methods
        .addcollectorpkc(collectorPkc)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error adding collector PKC:", error);
      throw error;
    }
  }

  /**
   * Submit a vote
   */
  async submitVote(electionId: string, voterId: string, voterCi: string) {
    try {
      const electionPubkey = new PublicKey(electionId);

      const [voterAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("voter"), electionPubkey.toBuffer(), Buffer.from(voterId)],
        this.program.programId
      );

      await this.program.methods
        .vote(voterId, voterCi)
        .accounts({
          electionData: electionPubkey,
          voterData: voterAccount,
          signer: this.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error submitting vote:", error);
      throw error;
    }
  }

  /**
   * Get voter status
   */
  async getVoterStatus(electionId: string, voterId: string) {
    try {
      const [voterAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("voter"),
          new PublicKey(electionId).toBuffer(),
          Buffer.from(voterId),
        ],
        this.program.programId
      );

      try {
        const voterData = await (this.program as any).account.voterData.fetch(
          voterAccount
        );
        return { hasVoted: voterData.voted };
      } catch {
        return { hasVoted: false };
      }
    } catch (error) {
      console.error("Error getting voter status:", error);
      throw error;
    }
  }

  /**
   * Sync collector public key
   */
  async syncCollectorPKC(electionId: string, collectorPkc: string) {
    try {
      await this.program.methods
        .syncCollectorPkc(collectorPkc)
        .accounts({
          electionData: new PublicKey(electionId),
          initiator: this.provider.wallet.publicKey,
        })
        .rpc();

      return { success: true };
    } catch (error) {
      console.error("Error syncing collector PKC:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
