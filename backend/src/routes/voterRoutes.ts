import { Router } from "express";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import prisma from "../prisma";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

// Add voter (admin only)
router.post("/add", adminMiddleware, async (req, res) => {
  try {
    const { email, voterId, electionId, role } = req.body;

    if (!email || !voterId || !electionId) {
      return res.status(400).json({
        error: "Missing required fields: email, voterId, electionId",
      });
    }

    const voter = await prisma.voterData.upsert({
      where: { email: email },
      update: {
        email,
        voterId,
        electionId,
        password: null,
        ci: "",
        auxi: "",
        role: role || "voter",
      },
      create: {
        email,
        voterId,
        electionId,
        password: null,
        ci: "",
        auxi: "",
        role: role || "voter",
      },
    });

    res.status(201).json({
      message: "Voter added successfully",
      voter: {
        id: voter.id,
        email: voter.email,
        voterId: voter.voterId,
        electionId: voter.electionId,
        role: voter.role,
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
      return res.status(400).json({ error: "Missing required fields: email, password" });
    }

    const voter = await prisma.voterData.findUnique({ where: { email } });

    if (!voter) {
      return res.status(404).json({
        error: "Voter not found. Please contact administrator to be added to the system.",
      });
    }

    if (voter.password) {
      return res.status(409).json({ error: "Voter already registered" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await prisma.voterData.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Voter registered successfully" });
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
      return res.status(400).json({ error: "Missing required fields: email, password" });
    }

    const voter = await prisma.voterData.findUnique({ where: { email } });

    if (!voter) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!voter.password) {
      return res.status(401).json({ error: "Voter not registered. Please register first." });
    }

    const isPasswordValid = await bcrypt.compare(password, voter.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(
      {
        email: voter.email,
        voterId: voter.voterId,
        electionId: voter.electionId,
        role: voter.role || "voter",
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: voter.role || "voter",
    });
  } catch (error) {
    console.error("Failed to login voter:", error);
    res.status(500).json({ error: "Failed to login voter" });
  }
});

// Get current user profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const voter = await prisma.voterData.findUnique({
      where: { email: req.user.email },
      select: { id: true, voterId: true, email: true, electionId: true, role: true },
    });
    if (!voter) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ data: voter });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// List all voters (admin only)
router.get("/list", adminMiddleware, async (req, res) => {
  try {
    const voters = await prisma.voterData.findMany({
      select: { id: true, voterId: true, email: true, electionId: true, ci: true, auxi: true, role: true },
    });
    res.status(200).json({ data: voters });
  } catch (error) {
    console.error("Failed to list voters:", error);
    res.status(500).json({ error: "Failed to list voters" });
  }
});

export const voterRoutes = router;
