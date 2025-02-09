import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    // Create manager user
    const hashedPassword = await bcrypt.hash('electionPDA', 10);
    
    const manager = await prisma.user.upsert({
      where: { email: 'admin@gmail.com' },
      update: {},
      create: {
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'MANAGER'
      }
    });
    
    console.log('Manager account created/verified:', manager.email);
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();