import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Plans
  const plans = [
    {
      name: 'Free',
      max_servers: 1,
      ram_mb: 2048,
      cpu_cores: 1.0,
      storage_gb: 5,
      max_players: 10,
      daily_uptime_hours: 12,
      backup_max_stored: 1,
      backup_frequency_hours: 24,
      queue_enabled: true,
    },
    {
      name: 'Basic',
      max_servers: 3,
      ram_mb: 4096,
      cpu_cores: 2.0,
      storage_gb: 20,
      max_players: 20,
      daily_uptime_hours: 24,
      backup_max_stored: 3,
      backup_frequency_hours: 12,
      queue_enabled: false,
    },
    {
      name: 'Pro',
      max_servers: 10,
      ram_mb: 8192,
      cpu_cores: 4.0,
      storage_gb: 50,
      max_players: 50,
      daily_uptime_hours: 24,
      backup_max_stored: 10,
      backup_frequency_hours: 6,
      queue_enabled: false,
    },
    {
      name: 'Enterprise',
      max_servers: 50,
      ram_mb: 32768,
      cpu_cores: 8.0,
      storage_gb: 200,
      max_players: 200,
      daily_uptime_hours: 24,
      backup_max_stored: 30,
      backup_frequency_hours: 2,
      queue_enabled: false,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Plans seeded');

  // 2. Populate PortPool (25565-30000)
  const existingPortsCount = await prisma.portPool.count();
  if (existingPortsCount === 0) {
    console.log('🔌 Populating PortPool (25565-30000)...');
    const ports: { port: number }[] = [];
    for (let port = 25565; port <= 30000; port++) {
      ports.push({ port });
    }
    
    // Batch create for performance
    const batchSize = 1000;
    for (let i = 0; i < ports.length; i += batchSize) {
      const batch = ports.slice(i, i + batchSize);
      await prisma.portPool.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
    console.log('✅ PortPool populated');
  } else {
    console.log(`✅ PortPool already has ${existingPortsCount} ports`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
