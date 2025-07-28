import { Router } from "express";
import { blockchainService } from "../services/blockchainService";
import prisma from "../prisma";

const router = Router();

// Create a new election
router.post("/create-election", async (req, res) => {
  try {
    const { totalVotes, totalCandidates } = req.body;

    if (!totalVotes || !totalCandidates) {
      return res.status(400).json({
        error: "Missing required fields: totalVotes, totalCandidates",
      });
    }

    const result = await blockchainService.createElection(
      totalVotes,
      totalCandidates
    );

    res.status(201).json({
      success: true,
      message: "Election created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating election:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to create election",
    });
  }
});

// Get all elections
router.get("/elections", async (req, res) => {
  try {
    const elections = await blockchainService.getAllElections();
    res.status(200).json({
      success: true,
      data: elections,
    });
  } catch (error) {
    console.error("Error fetching elections:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch elections",
    });
  }
});

// Get a specific election
router.get("/elections/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    const election = await blockchainService.getElection(electionId);
    res.status(200).json({
      success: true,
      data: election,
    });
  } catch (error) {
    console.error("Error fetching election:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch election",
    });
  }
});

// Change election stage
router.post("/elections/:electionId/change-stage", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { stage } = req.body;

    if (!stage || !["application", "voting", "closed"].includes(stage)) {
      return res.status(400).json({
        error: "Invalid stage. Must be one of: application, voting, closed",
      });
    }

    await blockchainService.changeElectionStage(electionId, stage);

    res.status(200).json({
      success: true,
      message: `Election stage changed to ${stage}`,
    });
  } catch (error) {
    console.error("Error changing election stage:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to change election stage",
    });
  }
});

// Add candidate to whitelist
router.post("/elections/:electionId/candidates", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { candidateName } = req.body;

    if (!candidateName) {
      return res.status(400).json({
        error: "Missing required field: candidateName",
      });
    }

    await blockchainService.addCandidate(electionId, candidateName);

    res.status(200).json({
      success: true,
      message: `Candidate ${candidateName} added to whitelist`,
    });
  } catch (error) {
    console.error("Error adding candidate:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add candidate",
    });
  }
});

// Remove candidate from whitelist
router.delete(
  "/elections/:electionId/candidates/:candidateName",
  async (req, res) => {
    try {
      const { electionId, candidateName } = req.params;

      await blockchainService.removeCandidate(electionId, candidateName);

      res.status(200).json({
        success: true,
        message: `Candidate ${candidateName} removed from whitelist`,
      });
    } catch (error) {
      console.error("Error removing candidate:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to remove candidate",
      });
    }
  }
);

// Add SKA to election
router.post("/elections/:electionId/ska", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { ska } = req.body;

    if (!ska) {
      return res.status(400).json({
        error: "Missing required field: ska",
      });
    }

    await blockchainService.addSKA(electionId, ska);

    res.status(200).json({
      success: true,
      message: "SKA added to election successfully",
    });
  } catch (error) {
    console.error("Error adding SKA:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add SKA",
    });
  }
});

// Add AUXT to election
router.post("/elections/:electionId/auxt", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { auxt } = req.body;

    if (!auxt) {
      return res.status(400).json({
        error: "Missing required field: auxt",
      });
    }

    await blockchainService.addAUXT(electionId, auxt);

    res.status(200).json({
      success: true,
      message: "AUXT added to election successfully",
    });
  } catch (error) {
    console.error("Error adding AUXT:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add AUXT",
    });
  }
});

// Add collector public key to election
router.post("/elections/:electionId/collector-pkc", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { collectorPkc } = req.body;

    if (!collectorPkc) {
      return res.status(400).json({
        error: "Missing required field: collectorPkc",
      });
    }

    await blockchainService.addCollectorPKC(electionId, collectorPkc);

    res.status(200).json({
      success: true,
      message: "Collector public key added to election successfully",
    });
  } catch (error) {
    console.error("Error adding collector PKC:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to add collector PKC",
    });
  }
});

// Submit a vote
router.post("/elections/:electionId/vote", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { voterId, voterCi, auxi } = req.body;

    if (!voterId || !voterCi || !auxi) {
      return res.status(400).json({
        error: "Missing required fields: voterId, voterCi, auxi",
      });
    }
    const existingVote = await prisma.voterData.findUnique({
      where: { voterId },
    });

    if (existingVote) {
      return res.status(409).json({ error: "Voter has already cast a vote" });
    }

    // Store the voter's data
    const voterData = await prisma.voterData.create({
      data: {
        voterId,
        ci: voterCi,
        auxi,
      },
    });

    await blockchainService.submitVote(electionId, voterId, voterCi);

    res.status(200).json({
      success: true,
      message: "Vote submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to submit vote",
    });
  }
});

// Get voter status
router.get("/elections/:electionId/voter-status/:voterId", async (req, res) => {
  try {
    const { electionId, voterId } = req.params;

    const status = await blockchainService.getVoterStatus(electionId, voterId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error getting voter status:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to get voter status",
    });
  }
});

// Sync collector public key
router.post("/elections/:electionId/sync-collector-pkc", async (req, res) => {
  try {
    const { electionId } = req.params;
    const { collectorPkc } = req.body;

    if (!collectorPkc) {
      return res.status(400).json({
        error: "Missing required field: collectorPkc",
      });
    }

    await blockchainService.syncCollectorPKC(electionId, collectorPkc);

    res.status(200).json({
      success: true,
      message: "Collector public key synced successfully",
    });
  } catch (error) {
    console.error("Error syncing collector PKC:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to sync collector PKC",
    });
  }
});

export const blockchainRoutes = router;
