import express, { application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { VotingSys } from "./types/voting_sys";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Default wallet configuration from Anchor.toml
const defaultWalletPath = path.resolve(
  process.env.HOME || "",
  ".config/solana/id.json"
);
let walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(defaultWalletPath, "utf-8")))
);

// Initialize Anchor provider and program
const connection = new Connection("http://localhost:8899");
let provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(walletKeypair),
  { commitment: "processed" }
);
anchor.setProvider(provider);

let program = new anchor.Program(
  require("voting_sys.json") as VotingSys,
  // Convert string to PublicKey
  provider
) as Program<VotingSys>;

// Endpoint to update wallet
app.post("/set-wallet", (req, res) => {
  try {
    const { secretKey } = req.body;
    walletKeypair = Keypair.fromSecretKey(Buffer.from(secretKey));
    provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(walletKeypair),
      { commitment: "processed" }
    );
    anchor.setProvider(provider);
    res.json({ message: "Wallet updated successfully" });
  } catch (error) {
    res.status(400).json({ error: "Invalid wallet key" });
  }
});

// Create election
app.post("/create-election", async (req, res) => {
  try {
    const { totalVotes, totalCandidates } = req.body;
    const electionPDA = new Keypair();

    const tx = await program.methods
      .createElection(new anchor.BN(totalVotes), new anchor.BN(totalCandidates))
      .accounts({
        electionData: electionPDA.publicKey,
      } as any)
      .signers([electionPDA])
      .rpc();

    res.json({
      success: true,
      electionId: electionPDA.publicKey.toString(),
      transaction: tx,
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Add voter to whitelist
app.post("/add-voter", async (req, res) => {
  try {
    const { electionKey, voterId } = req.body;
    await program.methods
      .addToVoterWhitelist(voterId)
      .accounts({
        electionData: new PublicKey(electionKey),
        initiator: provider.wallet.publicKey,
      } as any) // Type assertion to bypass the strict type checking
      .rpc();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Add candidate to whitelist
app.post("/add-candidate", async (req, res) => {
  try {
    const { electionId, candidateName } = req.body;
    await program.methods
      .addToCandidateWhitelist(candidateName)
      .accounts({
        electionData: new PublicKey(electionId),
        initiator: provider.wallet.publicKey,
      } as any)
      .rpc();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Register candidate
app.post("/register-candidate", async (req, res) => {
  try {
    const { electionId, candidateName } = req.body;
    const electionPubkey = new PublicKey(electionId);

    const [candidateAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        electionPubkey.toBuffer(),
        Buffer.from(candidateName),
      ],
      program.programId
    );

    await program.methods
      .registerCandidate(candidateName)
      .accounts({
        candidateData: candidateAccount,
        electionData: electionPubkey,
        initiator: provider.wallet.publicKey,
      } as any)
      .rpc();

    res.json({ success: true, candidateAccount: candidateAccount.toString() });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Change election stage
// Add this type definition after imports
type ElectionStageMap = {
  [K in "application" | "voting" | "closed"]: { [P in K]: {} };
};

app.post("/change-stage", async (req, res) => {
  try {
    const { electionId, stage } = req.body;
    const objmap: ElectionStageMap = {
      application: { application: {} },
      voting: { voting: {} },
      closed: { closed: {} },
    };

    if (!(stage in objmap)) {
      throw new Error("Invalid election stage");
    }

    await program.methods
      .changeStage(objmap[stage as keyof ElectionStageMap])
      .accounts({
        electionData: new PublicKey(electionId),
        initiator: provider.wallet.publicKey,
      } as any)
      .rpc();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Cast vote
app.post("/vote", async (req, res) => {
  try {
    const { electionId, voterId, candidateName } = req.body;
    const electionPubkey = new PublicKey(electionId);

    const [voterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), electionPubkey.toBuffer(), Buffer.from(voterId)],
      program.programId
    );

    const [candidateAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        electionPubkey.toBuffer(),
        Buffer.from(candidateName),
      ],
      program.programId
    );

    await program.methods
      .vote(voterId, candidateName)
      .accounts({
        electionData: electionPubkey,
        candidateData: candidateAccount,
        voterData: voterAccount,
        initiator: provider.wallet.publicKey,
      } as any)
      .rpc();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Get election data
app.get("/election/:electionId", async (req, res) => {
  try {
    const electionAccount = await program.account.electionData.fetch(
      new PublicKey(req.params.electionId)
    );
    res.json(electionAccount);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// Get candidate data
app.get("/candidate/:electionId/:candidateName", async (req, res) => {
  try {
    const { electionId, candidateName } = req.params;
    const electionPubkey = new PublicKey(electionId);

    const [candidateAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        electionPubkey.toBuffer(),
        Buffer.from(candidateName),
      ],
      program.programId
    );

    const candidateData = await program.account.candidateData.fetch(
      candidateAccount
    );
    res.json(candidateData);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
