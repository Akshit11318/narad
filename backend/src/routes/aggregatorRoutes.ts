import { Router } from "express";
import prisma from "../prisma";
import { aggregationService } from "../services/aggregationService";

const log = (message: string) => console.log("[*] Aggregator: " + message);

const router = Router();

// Get system parameters
router.get("/params", async (req, res) => {
  try {
    const systemParams = await prisma.systemParams.findFirst({ orderBy: { createdAt: "desc" } });
    if (!systemParams) return res.status(404).json({ error: "System parameters not found" });
    res.status(200).json({ N: systemParams.N, H: systemParams.H, skA: systemParams.skA });
  } catch (error) {
    console.error("Failed to fetch system parameters:", error);
    res.status(500).json({ error: "Failed to fetch system parameters" });
  }
});

// Compute auxiliary product (collector step)
router.post("/compute-aux/:electionId", async (req, res) => {
  try {
    const aux = await aggregationService.computeAuxProduct(req.params.electionId);
    res.status(200).json({ success: true, message: "Aux product computed", aux });
  } catch (error) {
    console.error("Error computing aux:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

// Aggregate votes and decrypt results
router.post("/aggregate/:electionId", async (req, res) => {
  try {
    log("Starting vote aggregation for election: " + req.params.electionId);
    const result = await aggregationService.aggregateVotes(req.params.electionId);
    log("Aggregation complete. Total votes: " + result.totalVotes);
    res.status(200).json({
      success: true,
      message: "Votes aggregated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error aggregating votes:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

// Get results for an election
router.get("/results/:electionId", async (req, res) => {
  try {
    const result = await aggregationService.getResults(req.params.electionId);
    if (!result) return res.status(404).json({ error: "No results found. Run aggregation first." });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed" });
  }
});

// Submit aggregation result (legacy)
router.post("/result", async (req, res) => {
  try {
    log("Receiving aggregation result submission");
    const { result, decodedVotes, electionId } = req.body;
    if (!result || !decodedVotes) {
      return res.status(400).json({ error: "Missing: result, decodedVotes" });
    }
    const existingResult = await prisma.aggregatedResult.findFirst({ where: { electionId } });
    if (existingResult) {
      await prisma.aggregatedResult.update({
        where: { id: existingResult.id },
        data: { result, decodedVotes: JSON.stringify(decodedVotes) },
      });
    } else {
      await prisma.aggregatedResult.create({
        data: { aux: "", result, decodedVotes: JSON.stringify(decodedVotes), electionId },
      });
    }
    res.status(200).json({ message: "Aggregation result submitted successfully" });
  } catch (error) {
    console.error("Failed to submit aggregation result:", error);
    res.status(500).json({ error: "Failed to submit aggregation result" });
  }
});

// Get all ciphertexts and auxiliary value
router.get("/ciphertexts-and-aux/:electionId", async (req, res) => {
  const { electionId } = req.params;
  try {
    log("Fetching all ciphertexts and auxiliary value");
    const voterData = await prisma.voterData.findMany({
      where: { electionId },
      select: { voterId: true, ci: true },
    });
    const aggregatedResult = await prisma.aggregatedResult.findFirst({
      where: { electionId },
      select: { aux: true },
    });
    const ciphertexts = voterData.map((voter) => ({ voterId: voter.voterId, ci: voter.ci }));
    res.status(200).json({ ciphertexts, aux: aggregatedResult?.aux || "" });
  } catch (error) {
    console.error("Failed to fetch:", error);
    res.status(500).json({ error: "Failed" });
  }
});

export const aggregatorRoutes = router;
