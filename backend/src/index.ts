import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { VotingSys } from "./types/voting_sys";
import authRouter from "./routes/auth";
import { auth, requireManager } from "./middleware/auth";
import idl from "./voting_sys.json";
import bs58 from "bs58";

// Configure dotenv before other code
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Use auth routes
app.use("/auth", authRouter);

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
  idl as VotingSys,
  provider
) as Program<VotingSys>;

// Protected manager routes
app.post("/create-election", auth, requireManager, async (req, res) => {
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
      error: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

app.post("/add-voter", auth, requireManager, async (req, res) => {
  try {
    const { electionKey, voterId } = req.body;
    await program.methods
      .addToVoterWhitelist(voterId)
      .accounts({
        electionData: new PublicKey(electionKey),
        initiator: provider.wallet.publicKey,
      } as any)
      .rpc();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

app.post("/add-candidate", auth, requireManager, async (req, res) => {
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
      error: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

app.post("/change-stage", auth, requireManager, async (req, res) => {
  try {
    const { electionId, stage } = req.body;
    const objmap = {
      application: { application: {} },
      voting: { voting: {} },
      closed: { closed: {} },
    };

    if (!(stage in objmap)) {
      throw new Error("Invalid election stage");
    }

    await program.methods
      .changeStage(objmap[stage as keyof typeof objmap])
      .accounts({
        electionData: new PublicKey(electionId),
        initiator: provider.wallet.publicKey,
      } as any)
      .rpc();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

app.post("/vote", auth, async (req, res) => {
  try {
    const { electionId, candidateName } = req.body;
    const voterId = req.user?.email; // Use email from JWT token as voterId

    if (!voterId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
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

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
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

// Get candidate whitelist
app.get("/election/:electionId/candidates", auth, async (req, res) => {
  try {
    const electionAccount = await program.account.electionData.fetch(
      new PublicKey(req.params.electionId)
    );
    res.json({
      stage: electionAccount.stage,
      candidates: electionAccount.candidateWhitelist,
    });
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

// Get current active election
app.get("/election/current", auth, async (_req, res) => {
  try {
    // Find election in "voting" stage
    const elections = await program.account.electionData.all([
      {
        memcmp: {
          offset: 0, // Adjust based on your struct layout
          bytes: bs58.encode(Buffer.from([1])) // Assuming 1 represents voting stage
        }
      }
    ]);
    
    if (elections.length === 0) {
      return res.status(404).json({ error: "No active election found" });
    }
    
    return res.json({
      id: elections[0].publicKey.toString(),
      ...elections[0].account
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "An unknown error occurred"
    });
  }
});

// Check voter status
app.get("/voter/status/:electionId", auth, async (req, res) => {
  try {
    const { electionId } = req.params;
    const voterId = req.user?.email;
    
    if (!voterId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const [voterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), new PublicKey(electionId).toBuffer(), Buffer.from(voterId)],
      program.programId
    );

    try {
      const voterData = await program.account.voterData.fetch(voterAccount);
      return res.json({ hasVoted: voterData.voted });
    } catch {
      return res.json({ hasVoted: false });
    }
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "An unknown error occurred"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
