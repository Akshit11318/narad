import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get system parameters, ciphertexts, and auxiliary product for aggregation
router.get('/data', async (req, res) => {
  try {
    // Get the most recent system parameters
    const systemParams = await prisma.systemParams.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!systemParams) {
      return res.status(404).json({ error: 'System parameters not found' });
    }

    // Get all ciphertexts
    const voterData = await prisma.voterData.findMany({
      select: { voterId: true, ci: true }
    });

    // Get auxiliary product
    const aggregatedResult = await prisma.aggregatedResult.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!aggregatedResult || !aggregatedResult.aux) {
      return res.status(404).json({ error: 'Auxiliary product not found. Collector must compute it first.' });
    }

    res.status(200).json({
      params: {
        N: systemParams.N,
        H: systemParams.H,
        skA: systemParams.skA
      },
      ciphertexts: voterData.map(v => v.ci),
      aux: aggregatedResult.aux
    });
  } catch (error) {
    console.error('Failed to fetch aggregation data:', error);
    res.status(500).json({ error: 'Failed to fetch aggregation data' });
  }
});

// Submit aggregation result
router.post('/result', async (req, res) => {
  try {
    const { result, decodedVotes } = req.body;
    
    if (!result || !decodedVotes) {
      return res.status(400).json({ error: 'Missing required fields: result, decodedVotes' });
    }

    // Store the aggregation result
    const existingResult = await prisma.aggregatedResult.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (existingResult) {
      await prisma.aggregatedResult.update({
        where: { id: existingResult.id },
        data: { 
          result,
          decodedVotes: JSON.stringify(decodedVotes)
        }
      });
    } else {
      await prisma.aggregatedResult.create({
        data: {
          aux: '',
          result,
          decodedVotes: JSON.stringify(decodedVotes)
        }
      });
    }

    res.status(200).json({
      message: 'Aggregation result submitted successfully'
    });
  } catch (error) {
    console.error('Failed to submit aggregation result:', error);
    res.status(500).json({ error: 'Failed to submit aggregation result' });
  }
});

export const aggregatorRoutes = router;
