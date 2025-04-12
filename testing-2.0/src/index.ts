import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { collectorRoutes } from './routes/collectorRoutes';
import { aggregatorRoutes } from './routes/aggregatorRoutes';
import { userRoutes } from './routes/userRoutes';
import prisma from './prisma';

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

// Initialize system parameters
async function initializeSystemParams() {
  try {
    // Check if system parameters already exist
    const existingParams = await prisma.systemParams.findFirst();
    
    if (!existingParams) {
      // Create default system parameters
      // These values should be replaced with actual secure values in production
      const defaultParams = {
        N: "B7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEF324E7738926CFBE5F4BF8D8D8C31D763DA06C80ABB1185EB4F7C7B5757F5958",
        H: "5FECEB66FFC86F38D952786C6D696C79C2DBC239DD4E91B46729D73A27FB57E9",
        skA: "1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF"
      };
      
      await prisma.systemParams.create({
        data: defaultParams
      });
      
      console.log('System parameters initialized successfully');
    } else {
      console.log('System parameters already exist');
    }
  } catch (error) {
    console.error('Failed to initialize system parameters:', error);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize system parameters on server start
  await initializeSystemParams();
});
