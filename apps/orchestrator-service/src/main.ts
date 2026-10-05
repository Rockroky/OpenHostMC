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

  // Security Headers Middleware
  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.removeHeader('X-Powered-By');
    next();
  });
  
  // Secure CORS configuration
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://localhost:3002'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:[0-9]+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin) ||
        /^http:\/\/192\.168\.[0-9]+\.[0-9]+(:[0-9]+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS blocked: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });
  
  // Add global prefix for all routes
  app.setGlobalPrefix('orchestrator');
  
  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Orchestrator service running on port ${port}`);
}
bootstrap();