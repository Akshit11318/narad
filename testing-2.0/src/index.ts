import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { collectorRoutes } from './routes/collectorRoutes';
import { aggregatorRoutes } from './routes/aggregatorRoutes';
import { userRoutes } from './routes/userRoutes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Enable CORS
app.use(cors());

// Middleware for logging
app.use(morgan('dev'));

// Middleware for parsing JSON bodies
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/collector', collectorRoutes);
app.use('/api/aggregator', aggregatorRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
