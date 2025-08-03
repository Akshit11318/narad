import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

interface JWTPayload {
  email: string;
  voterId: string;
  electionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Add user information to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Optional middleware for routes that can work with or without authentication
