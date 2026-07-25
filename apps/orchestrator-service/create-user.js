const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUser() {
  try {
    const user = await prisma.user.upsert({
      where: { email: 'test@openhostmc.com' },
      update: {},
      create: {
        email: 'test@openhostmc.com',
        username: 'testuser-' + Date.now(),
        password_hash: '$2b$10$test',
        verified: true,
      },
    });
    
    console.log('User created/updated:', user);
    console.log('User ID:', user.id);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createUser();
