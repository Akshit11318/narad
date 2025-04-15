import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// Get system parameters (N, H, skA)
router.get("/params", async (req, res) => {
  try {
    // Get the most recent system parameters
    const systemParams = await prisma.systemParams.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!systemParams) {
      return res.status(404).json({ error: "System parameters not found" });
    }

    res.status(200).json({
      N: systemParams.N,
      H: systemParams.H,
      skA: systemParams.skA,
    });
  } catch (error) {
    console.error("Failed to fetch system parameters:", error);
    res.status(500).json({ error: "Failed to fetch system parameters" });
  }
});

// Submit encrypted vote (ci)
router.post("/vote", async (req, res) => {
  try {
    const { voterId, ci, auxi } = req.body;

    if (!voterId || !ci || !auxi) {
      return res
        .status(400)
        .json({ error: "Missing required fields: voterId, ci, auxi" });
    }

    // Check if this voter has already voted
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
        ci,
        auxi,
      },
    });

    res.status(201).json({
      message: "Vote submitted successfully",
      id: voterData.id,
    });
  } catch (error) {
    console.error("Failed to submit vote:", error);
    res.status(500).json({ error: "Failed to submit vote" });
  }
});

// Update skA parameter
router.put("/params/ska", async (req, res) => {
  try {
    const { skA } = req.body;

    if (!skA) {
      return res.status(400).json({ error: "skA parameter is required" });
    }

    // Get the most recent system parameters
    const systemParams = await prisma.systemParams.findFirst();

    if (!systemParams) {
      return res.status(404).json({ error: "System parameters not found" });
    }

    // Update the skA parameter
    await prisma.systemParams.update({
      where: { id: systemParams.id },
      data: { skA },
    });

    res.status(200).json({ message: "skA parameter updated successfully" });
  } catch (error) {
    console.error("Failed to update skA parameter:", error);
    res.status(500).json({ error: "Failed to update skA parameter" });
  }
});

// Get voting result
router.get("/result", async (req, res) => {
  try {
    // Get the most recent aggregated result
    const aggregatedResult = await prisma.aggregatedResult.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!aggregatedResult) {
      return res.status(404).json({ error: "Results not found" });
    }

    res.status(200).json({
      result: aggregatedResult.result,
      decodedVotes: JSON.parse(aggregatedResult.decodedVotes),
    });
  } catch (error) {
    console.error("Failed to fetch election results:", error);
    res.status(500).json({ error: "Failed to fetch election results" });
  }
});

export const userRoutes = router;
