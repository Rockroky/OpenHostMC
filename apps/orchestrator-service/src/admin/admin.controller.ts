import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Logger, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { DockerService } from '../docker.service';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPERADMIN')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private prisma: PrismaService,
    private dockerService: DockerService,
  ) {}

  private serializeServer(server: any) {
    return {
      ...server,
      total_uptime_seconds: server.total_uptime_seconds !== null && server.total_uptime_seconds !== undefined
        ? server.total_uptime_seconds.toString()
        : "0",
      created_at: server.created_at?.toISOString(),
      updated_at: server.updated_at?.toISOString(),
      last_started_at: server.last_started_at?.toISOString() || null,
      last_stopped_at: server.last_stopped_at?.toISOString() || null,
    };
  }

  // ===== USER MANAGEMENT =====

  @Get('users')
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        include: { plan: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove password_hash from response
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);

    return {
      users: sanitizedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { username?: string; role?: string; verified?: boolean; plan_id?: string | null },
    @Req() req: any,
  ) {
    try {
      if (req.user.userId === id && body.role !== undefined) {
        throw new Error('Non puoi modificare i permessi del tuo stesso account.');
      }
      if (body.plan_id === null) {
        throw new Error('Un utente deve obbligatoriamente avere un piano.');
      }

      const updateData: any = { ...body };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        include: { plan: true },
      });

      const { password_hash, ...sanitizedUser } = user;
      return { success: true, user: sanitizedUser };
    } catch (error: any) {
      this.logger.error('Error updating user:', error);
      return { error: 'Failed to update user', details: error.message };
    }
  }

  @Get('stats')
  async getGlobalStats() {
    const [totalUsers, totalServers, activeServers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.mcServer.count(),
      this.prisma.mcServer.count({ where: { status: 'RUNNING' } }),
    ]);
    
    // Calculate total RAM used by running servers
    const runningServers = await this.prisma.mcServer.findMany({
      where: { status: 'RUNNING' },
      include: { plan: true }
    });
    
    const totalRamUsed = runningServers.reduce((acc, s) => acc + s.plan.ram_mb, 0);

    return {
      totalUsers,
      totalServers,
      activeServers,
      totalRamUsedMb: totalRamUsed,
    };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    try {
      // Delete user's servers first
      await this.prisma.mcServer.deleteMany({
        where: { owner_id: id },
      });

      // Delete user
      await this.prisma.user.delete({
        where: { id },
      });

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting user:', error);
      return { error: 'Failed to delete user', details: error.message };
    }
  }

  // ===== PLAN/TIER MANAGEMENT =====

  @Get('plans')
  async getAllPlans() {
    const plans = await this.prisma.plan.findMany({
      orderBy: { ram_mb: 'asc' },
    });
    return plans;
  }

  @Post('plans')
  async createPlan(@Body() body: {
    name: string;
    max_servers: number;
    ram_mb: number;
    cpu_cores: number;
    storage_gb: number;
    max_players: number;
    daily_uptime_hours: number;
    backup_max_stored: number;
    backup_frequency_hours: number;
    queue_enabled: boolean;
  }) {
    try {
      const plan = await this.prisma.plan.create({ data: body });
      return { success: true, plan };
    } catch (error) {
      this.logger.error('Error creating plan:', error);
      return { error: 'Failed to create plan', details: error.message };
    }
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      max_servers: number;
      ram_mb: number;
      cpu_cores: number;
      storage_gb: number;
      max_players: number;
      daily_uptime_hours: number;
      backup_max_stored: number;
      backup_frequency_hours: number;
      queue_enabled: boolean;
    }>,
  ) {
    try {
      const plan = await this.prisma.plan.update({
        where: { id },
        data: body,
      });
      return { success: true, plan };
    } catch (error) {
      this.logger.error('Error updating plan:', error);
      return { error: 'Failed to update plan', details: error.message };
    }
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') id: string) {
    try {
      const planToDelete = await this.prisma.plan.findUnique({ where: { id } });
      if (!planToDelete) throw new Error('Piano non trovato');
      if (planToDelete.name === 'Free' || planToDelete.name === 'SuperAdmin') {
        throw new Error('Impossibile eliminare i piani di sistema (Free e SuperAdmin).');
      }

      // Trova il piano "Free" per fare il fallback
      const freePlan = await this.prisma.plan.findFirst({ where: { name: 'Free' } });
      if (!freePlan) throw new Error('Piano Free non trovato per il fallback.');

      // Sposta tutti gli utenti collegati al piano da eliminare verso il piano Free
      await this.prisma.user.updateMany({
        where: { plan_id: id },
        data: { plan_id: freePlan.id },
      });

      // Elimina il piano
      await this.prisma.plan.delete({ where: { id } });
      
      return { success: true, message: 'Piano eliminato con successo. Gli utenti affetti sono stati spostati sul piano Free.' };
    } catch (error: any) {
      this.logger.error('Error deleting plan:', error);
      return { error: 'Failed to delete plan', details: error.message };
    }
  }

  // ===== SERVER MANAGEMENT =====

  @Get('servers')
  async getAllAdminServers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [servers, total] = await Promise.all([
      this.prisma.mcServer.findMany({
        skip,
        take: limitNum,
        include: { owner: { select: { id: true, username: true, email: true } }, plan: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.mcServer.count(),
    ]);

    return {
      servers: servers.map(s => this.serializeServer(s)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Delete('servers/:id')
  async adminDeleteServer(@Param('id') id: string) {
    try {
      // Stop container if running
      try {
        await this.dockerService.stopMinecraftServer(id);
      } catch (e) {
        // Container might not exist, ignore
      }

      await this.prisma.mcServer.delete({
        where: { id },
      });

      return { success: true, message: 'Server deleted by admin' };
    } catch (error) {
      this.logger.error('Error deleting server (admin):', error);
      return { error: 'Failed to delete server', details: error.message };
    }
  }

  // ===== DASHBOARD STATS =====

  @Get('stats')
  async getAdminStats() {
    const [
      totalUsers,
      totalServers,
      runningServers,
      stoppedServers,
      recentUsers,
      recentServers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.mcServer.count(),
      this.prisma.mcServer.count({ where: { status: 'RUNNING' } }),
      this.prisma.mcServer.count({ where: { status: 'STOPPED' } }),
      this.prisma.user.count({
        where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.mcServer.count({
        where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      users: { total: totalUsers, recent: recentUsers },
      servers: {
        total: totalServers,
        running: runningServers,
        stopped: stoppedServers,
        recent: recentServers,
      },
    };
  }
}
