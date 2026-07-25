import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crea piani
  const freePlan = await prisma.plan.upsert({
    where: { id: 'free' },
    update: {},
    create: {
      id: 'free',
      name: 'Free',
      description: 'Piano gratuito per iniziare',
      maxServers: 1,
      ramMb: 1536,
      diskGb: 10,
      priceMonthly: 0,
    },
  });

  const premiumPlan = await prisma.plan.upsert({
    where: { id: 'premium' },
    update: {},
    create: {
      id: 'premium',
      name: 'Premium',
      description: 'Risorse dedicate',
      maxServers: 5,
      ramMb: 4096,
      diskGb: 50,
      priceMonthly: 9.99,
    },
  });

  console.log(`✅ Piani creati:`, { freePlan, premiumPlan });

  // Popola pool porte (da 25565 a 30000)
  const existingPorts = await prisma.portPool.count();
  
  if (existingPorts === 0) {
    console.log('🔌 Creando pool di porte...');
    
    for (let port = 25565; port <= 30000; port++) {
      await prisma.portPool.create({
        data: {
          port,
          isUsed: false,
        },
      }).catch(() => {
        // Ignora duplicati
      });
    }
    
    console.log('✅ Pool di porte creato (25565-30000)');
  } else {
    console.log(`✅ Pool di porte già esistente (${existingPorts} porte)`);
  }

  console.log('✨ Seeding completato!');
}

main()
  .catch((e) => {
    console.error('❌ Errore seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
