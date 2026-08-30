import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    // Check for SuperAdmin (Hardcoded from ENV)
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

    if (superAdminEmail && superAdminPassword && email === superAdminEmail && password === superAdminPassword) {
      // Ensure default plans exist
      const defaultPlans = [
        {
          name: 'Free',
          max_servers: 2,
          max_running_servers: 1,
          ram_mb: 2048,
          cpu_cores: 1.0,
          storage_gb: 5,
          max_players: 10,
          daily_uptime_hours: 4,
          backup_max_stored: 1,
          backup_frequency_hours: 24,
          queue_enabled: true,
        },
        {
          name: 'Contributor',
          max_servers: 5,
          max_running_servers: 2,
          ram_mb: 4096,
          cpu_cores: 2.0,
          storage_gb: 15,
          max_players: 30,
          daily_uptime_hours: 12,
          backup_max_stored: 3,
          backup_frequency_hours: 12,
          queue_enabled: true,
        },
        {
          name: 'Premium',
          max_servers: 10,
          max_running_servers: 4,
          ram_mb: 8192,
          cpu_cores: 4.0,
          storage_gb: 30,
          max_players: 100,
          daily_uptime_hours: 24,
          backup_max_stored: 7,
          backup_frequency_hours: 6,
          queue_enabled: false,
        },
        {
          name: 'Ultra',
          max_servers: 20,
          max_running_servers: 10,
          ram_mb: 16384,
          cpu_cores: 8.0,
          storage_gb: 60,
          max_players: 500,
          daily_uptime_hours: 24,
          backup_max_stored: 14,
          backup_frequency_hours: 2,
          queue_enabled: false,
        }
      ];

      for (const planData of defaultPlans) {
        let plan = await this.prisma.plan.findFirst({ where: { name: planData.name } });
        if (!plan) {
          await this.prisma.plan.create({ data: planData });
        }
      }

      let defaultPlan = await this.prisma.plan.findFirst({ where: { name: 'Free' } });

      // Ensure SuperAdmin infinite plan exists
      let superAdminPlan = await this.prisma.plan.findFirst({ where: { name: 'SuperAdmin' } });
      if (!superAdminPlan) {
        superAdminPlan = await this.prisma.plan.create({
          data: {
            name: 'SuperAdmin',
            max_servers: 99999,
            max_running_servers: 99999,
            ram_mb: 999999,
            cpu_cores: 999.0,
            storage_gb: 99999,
            max_players: 9999,
            daily_uptime_hours: 24,
            backup_max_stored: 999,
            backup_frequency_hours: 1,
            queue_enabled: false,
          },
        });
      }

      // Find or create superadmin in DB
      const superAdmin = await this.prisma.user.upsert({
        where: { email: superAdminEmail },
        update: {
          role: UserRole.SUPERADMIN,
          verified: true,
          plan_id: superAdminPlan.id,
        },
        create: {
          email: superAdminEmail,
          username: 'SuperAdmin',
          password_hash: await bcrypt.hash(superAdminPassword, 12),
          role: UserRole.SUPERADMIN,
          verified: true,
          plan_id: superAdminPlan.id,
        },
        include: { plan: true },
      });
      
      const { password_hash: _, ...result } = superAdmin;
      return { ...result, requiresPasswordChange: false, planId: superAdmin.plan_id };
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { plan: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password change is required (first login)
    const requiresPasswordChange = user.password_hash === '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6';

    const { password_hash: _, ...result } = user;
    return { ...result, requiresPasswordChange, planId: user.plan_id };
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      planId: user.plan_id || user.planId || null,
      username: user.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
      requiresSetup: (user.role === 'ADMIN' || user.role === 'SUPERADMIN') && !user.setup_completed,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        planId: user.plan_id || user.planId || null,
        plan: user.plan,
        requiresPasswordChange: user.requiresPasswordChange,
        setup_completed: user.setup_completed || false,
      },
    };
  }

  async register(email: string, username: string, password: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get or create default free tier plan
    let defaultPlan = await this.prisma.plan.findFirst({
      where: { name: 'Free' },
    });

    if (!defaultPlan) {
      defaultPlan = await this.prisma.plan.create({
        data: {
          name: 'Free',
          max_servers: 2,
          max_running_servers: 1,
          ram_mb: 2048,
          cpu_cores: 1.0,
          storage_gb: 5,
          max_players: 10,
          daily_uptime_hours: 4,
          backup_max_stored: 1,
          backup_frequency_hours: 24,
          queue_enabled: true,
        },
      });
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password_hash: hashedPassword,
        role: 'USER',
        verified: false,
        plan_id: defaultPlan.id,
      },
      include: { plan: true },
    });

    const { password_hash: _, ...result } = user;
    return this.login({ ...result, planId: result.plan_id });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedNewPassword },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async completeAdminSetup(userId: string, newPassword: string, securityQuestion: string, securityAnswer: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.setup_completed) throw new Error('Setup already completed');

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    const hashedAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);
    
    // Generate recovery key
    const crypto = require('crypto');
    const recoveryKey = crypto.randomBytes(16).toString('hex').toUpperCase();
    const hashedRecoveryKey = await bcrypt.hash(recoveryKey, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedNewPassword,
        security_question: securityQuestion,
        security_answer_hash: hashedAnswer,
        recovery_key_hash: hashedRecoveryKey,
        setup_completed: true,
      },
    });

    return { success: true, recoveryKey };
  }
}
