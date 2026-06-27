import { Router } from "express";
import { blockchainService } from "../services/blockchainService";
import prisma from "../prisma";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

router.post("/create-election", adminMiddleware, async (req, res) => {
  try {
    const { totalVotes, totalCandidates } = req.body;
    if (!totalVotes || !totalCandidates) {
      return res.status(400).json({ error: "Missing required fields: totalVotes, totalCandidates" });
    }
    const result = await blockchainService.createElection(totalVotes, totalCandidates);
    res.status(201).json({ success: true, message: "Election created successfully", data: result });
  } catch (error) {
    console.error("Error creating election:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create election" });
  }
});

router.get("/elections", async (req, res) => {
  try {
    const elections = await blockchainService.getAllElections();
    res.status(200).json({ success: true, data: elections });
  } catch (error) {
    console.error("Error fetching elections:", error);
    res.status(200).json({ success: true, data: [], error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/elections/:electionId", async (req, res) => {
  try {
    const election = await blockchainService.getElection(req.params.electionId);
    res.status(200).json({ success: true, data: election });
  } catch (error) {
    console.error("Error fetching election:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/change-stage", adminMiddleware, async (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage || !["application", "voting", "closed"].includes(stage)) {
      return res.status(400).json({ error: "Invalid stage. Must be: application, voting, or closed" });
    }
    await blockchainService.changeElectionStage(req.params.electionId, stage);
    res.status(200).json({ success: true, message: "Stage changed to " + stage });
  } catch (error) {
    console.error("Error changing stage:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/elections/:electionId/candidates", async (req, res) => {
  try {
    const candidates = await blockchainService.getCandidates(req.params.electionId);
    res.status(200).json({ success: true, data: candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/candidates", adminMiddleware, async (req, res) => {
  try {
    const { candidateName } = req.body;
    if (!candidateName) return res.status(400).json({ error: "Missing: candidateName" });
    await blockchainService.addCandidate(req.params.electionId, candidateName);
    res.status(200).json({ success: true, message: "Candidate " + candidateName + " added" });
  } catch (error) {
    console.error("Error adding candidate:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.delete("/elections/:electionId/candidates/:candidateName", adminMiddleware, async (req, res) => {
  try {
    await blockchainService.removeCandidate(req.params.electionId, req.params.candidateName);
    res.status(200).json({ success: true, message: "Candidate removed" });
  } catch (error) {
    console.error("Error removing candidate:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/ska", adminMiddleware, async (req, res) => {
  try {
    const { ska } = req.body;
    if (!ska) return res.status(400).json({ error: "Missing: ska" });
    await blockchainService.addSKA(req.params.electionId, ska);
    res.status(200).json({ success: true, message: "SKA added" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/auxt", adminMiddleware, async (req, res) => {
  try {
    const { auxt } = req.body;
    if (!auxt) return res.status(400).json({ error: "Missing: auxt" });
    await prisma.aggregatedResult.update({
      where: { electionId: req.params.electionId },
      data: { aux: auxt },
    }).catch(() => {});
    await blockchainService.addAUXT(req.params.electionId, auxt);
    res.status(200).json({ success: true, message: "AUXT added" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/collector-pkc", adminMiddleware, async (req, res) => {
  try {
    const { collectorPkc } = req.body;
    if (!collectorPkc) return res.status(400).json({ error: "Missing: collectorPkc" });
    await blockchainService.addCollectorPKC(req.params.electionId, collectorPkc);
    res.status(200).json({ success: true, message: "Collector PKC added" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/vote", authMiddleware, async (req, res) => {
  try {
    const { voterId, voterCi, auxi } = req.body;
    if (!voterId || !voterCi || !auxi) {
      return res.status(400).json({ error: "Missing: voterId, voterCi, auxi" });
    }
    const existingVote = await prisma.voterData.findFirst({ where: { voterId, electionId: req.params.electionId } });
    if (!existingVote) return res.status(404).json({ error: "Invalid voter" });

    await blockchainService.submitVote(req.params.electionId, voterId, voterCi);
    await prisma.voterData.update({
      where: { id: existingVote.id },
      data: { voterId, ci: voterCi, auxi, electionId: req.params.electionId },
    });
    res.status(200).json({ success: true, message: "Vote submitted" });
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/elections/:electionId/voter-status/:voterId", async (req, res) => {
  try {
    const status = await blockchainService.getVoterStatus(req.params.electionId, req.params.voterId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.post("/elections/:electionId/sync-collector-pkc", async (req, res) => {
  try {
    const { collectorPkc } = req.body;
    if (!collectorPkc) return res.status(400).json({ error: "Missing: collectorPkc" });
    await blockchainService.syncCollectorPKC(req.params.electionId, collectorPkc);
    res.status(200).json({ success: true, message: "Collector PKC synced" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

router.get("/wallet-info", adminMiddleware, (req, res) => {
  try {
    res.status(200).json({ success: true, publicKey: blockchainService.getWalletPublicKey() });
  } catch (error) {
    res.status(500).json({ error: "Failed to get wallet info" });
  }
});

export const blockchainRoutes = router;
