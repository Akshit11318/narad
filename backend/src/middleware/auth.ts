import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: string;
  email: string;
  role: 'manager' | 'voter';
  createdAt: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

export const requireManager = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Manager access required.' });
  }
  next();
  return;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;
    req.user = decoded; // Attach the decoded user info to the request
    next();
    return; // Explicitly return after calling next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};