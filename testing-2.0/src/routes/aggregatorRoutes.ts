import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get system parameters for aggregator initialization
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

// Get all ciphertexts (ci) and auxiliary value (aux)
router.get('/ciphertexts-and-aux', async (req, res) => {
  try {
    // Get all voter data with ciphertexts
    const voterData = await prisma.voterData.findMany({
      select: { voterId: true, ci: true }
    });

    // Get the most recent auxiliary value
    const aggregatedResult = await prisma.aggregatedResult.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { aux: true }
    });

    // Extract ciphertexts
    const ciphertexts = voterData.map(voter => ({
      voterId: voter.voterId,
      ci: voter.ci
    }));

    res.status(200).json({
      ciphertexts: ciphertexts,
      aux: aggregatedResult?.aux || ''
    });
  } catch (error) {
    console.error('Failed to fetch ciphertexts and auxiliary value:', error);
    res.status(500).json({ error: 'Failed to fetch ciphertexts and auxiliary value' });
  }
});

export const aggregatorRoutes = router;
