import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get system parameters for collector initialization
router.get('/params', async (req, res) => {
  try {
    // Get the most recent system parameters
    const systemParams = await prisma.systemParams.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!systemParams) {
      return res.status(404).json({ error: 'System parameters not found' });
    }

    res.status(200).json({
      N: systemParams.N,
      H: systemParams.H,
      skA: systemParams.skA
    });
  } catch (error) {
    console.error('Failed to fetch system parameters:', error);
    res.status(500).json({ error: 'Failed to fetch system parameters' });
  }
});

// Get all auxiliary values
router.get('/fetch-auxiliary', async (req, res) => {
  try {
    // Get all voter data with auxiliary values
    const voterData = await prisma.voterData.findMany({
      select: { voterId: true, auxi: true }
    });

    res.status(200).json({ auxiliaryValues: voterData });
  } catch (error) {
    console.error('Failed to fetch auxiliary values:', error);
    res.status(500).json({ error: 'Failed to fetch auxiliary values' });
  }
});

// Submit computed auxiliary product (aux)
router.post('/aux', async (req, res) => {
  try {
    const { aux } = req.body;
    
    if (!aux) {
      return res.status(400).json({ error: 'Missing required field: aux' });
    }

    // Store the auxiliary product or update if exists
    const existingResult = await prisma.aggregatedResult.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (existingResult) {
      await prisma.aggregatedResult.update({
        where: { id: existingResult.id },
        data: {
          aux,
          result: existingResult.result,
          decodedVotes: existingResult.decodedVotes
        }
      });
    } else {
      await prisma.aggregatedResult.create({
        data: {
          aux,
          result: '',
          decodedVotes: '[]'
        }
      });
    }

    res.status(200).json({
      message: 'Auxiliary product submitted successfully'
    });
  } catch (error) {
    console.error('Failed to submit auxiliary product:', error);
    res.status(500).json({ error: 'Failed to submit auxiliary product' });
  }
});

export const collectorRoutes = router;
