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
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.removeHeader('X-Powered-By');
    next();
  });

  // CORS configuration — permissive in dev/staging, configurable in production
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, mobile apps, curl)
      if (!origin) return callback(null, true);

      // In dev/staging allow all origins
      if (!isProduction) return callback(null, true);

      // Allow wildcard in allowlist
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Check explicit allowlist or wildcard domains (*.example.com)
      if (
        allowedOrigins.some((allowed) => {
          if (allowed === origin) return true;
          if (allowed.startsWith('*.')) {
            const rootDomain = allowed.slice(2);
            try {
              const url = new URL(origin);
              return url.hostname === rootDomain || url.hostname.endsWith(`.${rootDomain}`);
            } catch {
              return false;
            }
          }
          return false;
        })
      ) {
        return callback(null, true);
      }

      // Allow localhost and 127.0.0.1 on any port (http + https)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow private network subnets (192.168.x.x, 172.16-31.x.x, 10.x.x.x)
      if (
        /^https?:\/\/192\.168\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/.test(origin) ||
        /^https?:\/\/10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/.test(origin) ||
        /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Safely disallow without throwing unhandled Error
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
    ],
    maxAge: 86400,
  });

  // Add global prefix for all routes
  app.setGlobalPrefix('orchestrator');

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Orchestrator service running on port ${port}`);
}
bootstrap();
