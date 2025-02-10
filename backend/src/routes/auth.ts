import { Router } from 'express';
// import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
// import { error } from 'console';

const router = Router();

// ./register
// router.post('/auth/voter/signup', async (req, res) => {
//   try {
//     const { email, password, role } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 10);
    
//     const user = await prisma.user.create({
//       data: {
//         email,
//         password: hashedPassword,
//         role,
//       },
//     });

//     const token = jwt.sign(
//       { 
//         id: user.id, 
//         email: user.email, 
//         role: user.role.toLowerCase(),
//         createdAt: user.createdAt.toISOString()
//       },
//       process.env.JWT_SECRET!,
//       { expiresIn: '24h' }
//     );

//     res.json({ token });
//   } catch (error) {
//     res.status(400).json({ error: 'Registration failed' });
//   }
// });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({error: 'Invalid User'});
    }
    
    const isPasswordSame = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!isPasswordSame) {
      return res.status(401).json({ error: 'Invalid Password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role.toLowerCase(),
        createdAt: user.createdAt.toISOString()
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  
    return res.json({ token });
  } catch (error) {
    return res.status(400).json({ error: 'Login failed' });
  }
});

router.post('/manager/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await prisma.user.findFirst({
      where: { email, role: 'MANAGER' } // using DB value (uppercase) for lookup
    });

    if (!user ) {
      return res.status(401).json({ error: 'Invalid User' });
    }
    else {
      if (!user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const isPasswordSame = user.password ? await bcrypt.compare(password, user.password) : false;
      if(!isPasswordSame){
        return res.status(401).json({error: 'Invalid Credentials'})
      }
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role.toLowerCase(),
          createdAt: user.createdAt.toISOString()
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
      );
      return res.status(200).json({ token });
    }}
    // Convert role (from DB, e.g. 'MANAGER') to lowercase in the token
     catch (error) {
    console.error('Manager login error:', error);
    return res.status(400).json({ error: 'Login failed' });
  }
});

router.get('/verify', requireAuth, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    return res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
});

router.post('/voter/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser?.password) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'VOTER',
      },
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role.toLowerCase(),
        createdAt: user.createdAt.toISOString()
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return res.json({ token });
  } catch (error) {
    console.error('Voter signup error:', error);
    return res.status(400).json({ error: 'Registration failed' });
  }
});

export default router;
