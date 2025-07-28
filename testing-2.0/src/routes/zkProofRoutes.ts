import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Submit ZK proof
router.post("/submit", async (req: Request, res: Response) => {
  try {
    console.log("📥 ZK Proof submission request received");
    console.log("📊 Request body keys:", Object.keys(req.body));

    const {
      electionId,
      voterId,
      zkProofData,
      publicVerificationPackage,
      verificationCode,
    } = req.body;

    console.log("🔍 Validating required fields...");
    console.log("  - electionId:", electionId ? "✅ Present" : "❌ Missing");
    console.log("  - voterId:", voterId ? "✅ Present" : "❌ Missing");
    console.log("  - zkProofData:", zkProofData ? "✅ Present" : "❌ Missing");
    console.log(
      "  - publicVerificationPackage:",
      publicVerificationPackage ? "✅ Present" : "❌ Missing"
    );
    console.log(
      "  - verificationCode:",
      verificationCode ? "✅ Present" : "❌ Missing"
    );

    // Validate required fields
    if (
      !electionId ||
      !voterId ||
      !zkProofData ||
      !publicVerificationPackage ||
      !verificationCode
    ) {
      console.log("❌ Validation failed - missing required fields");
      return res.status(400).json({
        error: "Missing required fields",
        required: [
          "electionId",
          "voterId",
          "zkProofData",
          "publicVerificationPackage",
          "verificationCode",
        ],
        received: {
          electionId: !!electionId,
          voterId: !!voterId,
          zkProofData: !!zkProofData,
          publicVerificationPackage: !!publicVerificationPackage,
          verificationCode: !!verificationCode,
        },
      });
    }

    console.log("🔍 Checking for existing verification code...");
    // Check if verification code already exists
    const existingProof = await prisma.zKProof.findUnique({
      where: { verificationCode },
    });

    if (existingProof) {
      console.log("❌ Verification code already exists:", verificationCode);
      return res
        .status(409)
        .json({ error: "Verification code already exists" });
    }

    console.log("💾 Storing ZK proof in database...");
    // Store the ZK proof
    const zkProof = await prisma.zKProof.create({
      data: {
        electionId,
        voterId,
        zkProofData: JSON.stringify(zkProofData),
        publicVerificationPackage: JSON.stringify(publicVerificationPackage),
        verificationCode,
        verified: false,
      },
    });

    console.log("✅ ZK proof stored successfully");
    console.log("📝 Verification code:", zkProof.verificationCode);
    console.log("⏰ Timestamp:", zkProof.timestamp);

    res.status(201).json({
      success: true,
      verificationCode: zkProof.verificationCode,
      timestamp: zkProof.timestamp,
    });
  } catch (error) {
    console.error("❌ Error submitting ZK proof:", error);
    console.error("📊 Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
    });

    res.status(500).json({
      error: "Internal server error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get public verification data by verification code
router.get("/public/:verificationCode", async (req: Request, res: Response) => {
  try {
    const { verificationCode } = req.params;

    if (!verificationCode || verificationCode.length !== 16) {
      return res
        .status(400)
        .json({ error: "Invalid verification code format" });
    }

    const zkProof = await prisma.zKProof.findUnique({
      where: { verificationCode },
      select: {
        verificationCode: true,
        electionId: true,
        publicVerificationPackage: true,
        verified: true,
        timestamp: true,
      },
    });

    if (!zkProof) {
      return res.status(404).json({ error: "Verification code not found" });
    }

    res.json({
      verificationCode: zkProof.verificationCode,
      electionId: zkProof.electionId,
      publicVerificationPackage: JSON.parse(zkProof.publicVerificationPackage),
      isVerified: zkProof.verified,
      timestamp: zkProof.timestamp,
    });
  } catch (error) {
    console.error("Error fetching public verification data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify a ZK proof
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { verificationCode, publicVerificationPackage } = req.body;

    let zkProof;
    let verificationData;

    if (verificationCode) {
      // Verify by code
      zkProof = await prisma.zKProof.findUnique({
        where: { verificationCode },
      });

      if (!zkProof) {
        return res.status(404).json({ error: "Verification code not found" });
      }

      verificationData = JSON.parse(zkProof.publicVerificationPackage);
    } else if (publicVerificationPackage) {
      // Verify by JSON package
      verificationData = publicVerificationPackage;
    } else {
      return res
        .status(400)
        .json({
          error:
            "Either verification code or public verification package is required",
        });
    }

    // Simulate ZK proof verification (replace with actual verification logic)
    const isValid = await performZKVerification(verificationData);

    // Update verification status if verifying by code
    if (zkProof) {
      await prisma.zKProof.update({
        where: { verificationCode },
        data: {
          verified: isValid,
          verificationAttempts: { increment: 1 },
          lastVerificationAt: new Date(),
        },
      });
    }

    res.json({
      isValid,
      verificationCode: verificationCode || "N/A",
      timestamp: new Date(),
      verificationData,
    });
  } catch (error) {
    console.error("Error verifying ZK proof:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get election statistics
router.get("/stats/:electionId", async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;

    const stats = await prisma.zKProof.groupBy({
      by: ["electionId"],
      where: { electionId },
      _count: {
        _all: true,
      },
    });

    const verifiedCount = await prisma.zKProof.count({
      where: {
        electionId,
        verified: true,
      },
    });

    const totalCount = stats[0]?._count._all || 0;

    res.json({
      electionId,
      totalVotes: totalCount,
      verifiedVotes: verifiedCount,
      verificationRate: totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0,
    });
  } catch (error) {
    console.error("Error fetching election stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simulated ZK verification function (replace with actual implementation)
async function performZKVerification(verificationData: any): Promise<boolean> {
  // Simulate verification delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Basic validation checks
  if (!verificationData.proof || !verificationData.publicInputs) {
    return false;
  }

  // In a real implementation, this would:
  // 1. Verify the proof cryptographically
  // 2. Check the public inputs match the expected format
  // 3. Validate the commitment scheme
  // 4. Verify the range proofs

  // For now, simulate a 95% success rate
  return Math.random() > 0.05;
}

export { router as zkProofRoutes };
