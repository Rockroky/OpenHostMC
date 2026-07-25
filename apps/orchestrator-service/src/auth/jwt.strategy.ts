import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    // SuperAdmin bypass DB
    if (payload.role === UserRole.SUPERADMIN && payload.sub === '00000000-0000-0000-0000-000000000000') {
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        planId: null,
        plan: null,
        username: payload.username,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { plan: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Attach user info to request
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      planId: user.plan_id,
      plan: user.plan,
      username: user.username,
    };
  }
}
