import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { collectorRoutes } from "./routes/collectorRoutes";
import { aggregatorRoutes } from "./routes/aggregatorRoutes";
import { voterRoutes } from "./routes/voterRoutes";

import { blockchainRoutes } from "./routes/blockchainRoutes";
import prisma from "./prisma";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Enable CORS
app.use(cors());

// Middleware for logging
app.use(morgan("dev"));

// Middleware for parsing JSON bodies
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/collector", collectorRoutes);
app.use("/api/aggregator", aggregatorRoutes);
app.use("/api/voter", voterRoutes);

app.use("/api/blockchain", blockchainRoutes);

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      message: "An error occurred",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// Initialize system parameters
async function initializeSystemParams() {
  try {
    // Check if system parameters already exist
    const existingParams = await prisma.systemParams.findFirst();

    // Always override existing parameters to ensure uniformity
    const defaultParams = {
      N: "400000000000000000000000211d1b86000000000000000001b131395144546b",
      H: "2e0f69afca2410fda28718e5623a7a755531ae6dd30a286ec6737b8b2a6a7b61",
      skA: "2481c95a9eb72624f93de30ccd1118fbccfb637cd367ad167433a866751833b",
    };

    if (existingParams) {
      await prisma.systemParams.update({
        where: { id: existingParams.id },
        data: defaultParams,
      });
      console.log("System parameters updated successfully");
    } else {
      // Create new parameters if none exist
      await prisma.systemParams.create({
        data: defaultParams,
      });
      console.log("System parameters initialized successfully");
    }
  } catch (error) {
    console.error("Failed to initialize system parameters:", error);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Initialize system parameters on server start
  await initializeSystemParams();
});
