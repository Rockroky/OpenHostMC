import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';
import { PrismaService } from './prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Upsert superadmin on bootstrap
  const prisma = app.get(PrismaService);
  const superAdminEmail = process.env.SUPERADMIN_EMAIL;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
  
  if (superAdminEmail && superAdminPassword) {
    // First, make sure we have a default plan
    let defaultPlan = await prisma.plan.findFirst({
      where: { name: 'Free' },
    });
    if (!defaultPlan) {
      defaultPlan = await prisma.plan.create({
        data: {
          name: 'Free',
          max_servers: 1,
          ram_mb: 2048,
          cpu_cores: 1.0,
          storage_gb: 5,
          max_players: 10,
          daily_uptime_hours: 24,
          backup_max_stored: 1,
          backup_frequency_hours: 24,
          queue_enabled: true,
        },
      });
    }
    
    await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {
        role: UserRole.SUPERADMIN,
        verified: true,
        plan_id: defaultPlan.id,
      },
      create: {
        email: superAdminEmail,
        username: 'SuperAdmin',
        password_hash: await bcrypt.hash(superAdminPassword, 12),
        role: UserRole.SUPERADMIN,
        verified: true,
        plan_id: defaultPlan.id,
      },
    });
    console.log('SuperAdmin upserted successfully');
  }
  
  // Register global interceptor for BigInt conversion
  app.useGlobalInterceptors(new BigIntInterceptor());
  
  // Enable CORS for all origins (frontend on different port)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });
  
  // Add global prefix for all routes
  app.setGlobalPrefix('orchestrator');
  
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`Orchestrator service running on port ${port}`);
}
bootstrap();