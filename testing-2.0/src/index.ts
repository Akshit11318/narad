import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { collectorRoutes } from "./routes/collectorRoutes";
import { aggregatorRoutes } from "./routes/aggregatorRoutes";
import { userRoutes } from "./routes/userRoutes";
import { zkProofRoutes } from "./routes/zkProofRoutes";
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
app.use("/api/user", userRoutes);
app.use("/api/zkproof", zkProofRoutes);
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
      N: "a94337c30ddffe19568c42e4865e088c756e023111e305c8e7454e6ef12fd85e99c68e306cd6a6945e78915d1aba494ae575fa174a82abd4c2c7c66dd2982a6a",
      H: "d5fe5496895615b93b7bd501f94c390bdb942bf41ab18d1917dfd3aefc1e1952f23f4504700b5eeec7186bc6dec990db64b9ea1eadce566e21b6f8429565cc0",
      skA: "d5fe5496895615b93b7bd501f94c390bdb942bf41ab18d1917dfd3aefc1e1952f23f4504700b5eeec7186bc6dec990db64b9ea1eadce566e21b6f8429565cc0",
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
