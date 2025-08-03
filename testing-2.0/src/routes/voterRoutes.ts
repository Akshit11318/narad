import { Router } from "express";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import prisma from "../prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Add voter by email, voterId, and electionId
router.post("/add", async (req, res) => {
  try {
    const { email, voterId, electionId } = req.body;

    if (!email || !voterId || !electionId) {
      return res.status(400).json({
        error: "Missing required fields: email, voterId, electionId",
      });
    }

    // Check if voter already exists for this election

    // Create new voter
    const voter = await prisma.voterData.upsert({
      where: { email: email },
      update: {
        email,
        voterId,
        electionId,
        password: null, // Will be set during registration
        ci: "",
        auxi: "",
      },
      create: {
        email,
        voterId,
        electionId,
        password: null, // Will be set during registration
        ci: "",
        auxi: "",
      },
    });

    res.status(201).json({
      message: "Voter added successfully",
      voter: {
        id: voter.id,
        email: voter.email,
        voterId: voter.voterId,
        electionId: voter.electionId,
      },
    });
  } catch (error) {
    console.error("Failed to add voter:", error);
    res.status(500).json({ error: "Failed to add voter" });
  }
});

// Register voter with password
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing required fields: email, password",
      });
    }

    // Check if voter exists
    const voter = await prisma.voterData.findUnique({
      where: { email },
    });

    if (!voter) {
      return res.status(404).json({
        error:
          "Voter not found. Please contact administrator to be added to the system.",
      });
    }

    if (voter.password) {
      return res.status(409).json({
        error: "Voter already registered",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update voter with password
    await prisma.voterData.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      message: "Voter registered successfully",
    });
  } catch (error) {
    console.error("Failed to register voter:", error);
    res.status(500).json({ error: "Failed to register voter" });
  }
});

// Login voter
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing required fields: email, password",
      });
    }

    // Find voter by email
    const voter = await prisma.voterData.findUnique({
      where: { email },
    });

    if (!voter) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    if (!voter.password) {
      return res.status(401).json({
        error: "Voter not registered. Please register first.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, voter.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(
      {
        email: voter.email,
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Failed to login voter:", error);
    res.status(500).json({ error: "Failed to login voter" });
  }
});

// Get voter profile (protected route)

export const voterRoutes = router;
