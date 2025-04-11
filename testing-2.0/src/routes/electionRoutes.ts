import { Router } from 'express';
import prisma from '../prisma';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = Router();

// Create a new election with parameters
router.post('/', async (req, res) => {
  try {
    const { name, description, electionParamsId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    // Get election parameters
    let electionParams;
    
    if (electionParamsId) {
      // Use provided parameter ID
      electionParams = await prisma.electionParams.findUnique({
        where: { id: Number(electionParamsId) }
      });
      
      if (!electionParams) {
        return res.status(400).json({ error: 'Invalid electionParamsId' });
      }
    } else {
      // Use the most recent parameters from the database
      electionParams = await prisma.electionParams.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      if (!electionParams) {
        return res.status(400).json({ 
          error: 'No cryptographic parameters found in the database. Please run initializeSystemParams.ts first.' 
        });
      }
    }

    // Create the election
    const election = await prisma.election.create({
      data: {
        name,
        description,
        electionParamsId: electionParams.id
      }
    });

    res.status(201).json({
      message: 'Election created successfully',
      election,
      params: electionParams
    });
  } catch (error) {
    console.error('Failed to create election:', error);
    res.status(500).json({ error: 'Failed to create election' });
  }
});

// Get election by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const election = await prisma.election.findUnique({
      where: { id: Number(id) },
      include: { electionParams: true }
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.status(200).json(election);
  } catch (error) {
    console.error('Failed to fetch election:', error);
    res.status(500).json({ error: 'Failed to fetch election' });
  }
});

// Get all elections
router.get('/', async (_, res) => {
  try {
    const elections = await prisma.election.findMany({
      include: { electionParams: true }
    });
    
    res.status(200).json(elections);
  } catch (error) {
    console.error('Failed to fetch elections:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// Update election status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Missing status field' });
    }
    
    const allowedStatuses = ['SETUP', 'VOTING', 'TALLYING', 'COMPLETED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowedStatuses.join(', ')}` });
    }
    
    const updatedElection = await prisma.election.update({
      where: { id: Number(id) },
      data: { status },
      include: { electionParams: true }
    });
    
    res.status(200).json({
      message: 'Election status updated successfully',
      election: updatedElection
    });
  } catch (error) {
    console.error('Failed to update election status:', error);
    res.status(500).json({ error: 'Failed to update election status' });
  }
});

// Get the cryptographic parameters for an election
router.get('/:id/params', async (req, res) => {
  try {
    const { id } = req.params;
    
    const election = await prisma.election.findUnique({
      where: { id: Number(id) },
      include: { electionParams: true }
    });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.status(200).json({
      N: election.electionParams.N,
      H: election.electionParams.H
    });
  } catch (error) {
    console.error('Failed to fetch election parameters:', error);
    res.status(500).json({ error: 'Failed to fetch election parameters' });
  }
});

export const electionRoutes = router;
