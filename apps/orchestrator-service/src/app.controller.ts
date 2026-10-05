import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
  Request,
  Req,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DockerService } from './docker.service';
import { VersionService } from './version.service';
import { ConsoleGateway } from './console.gateway';
import { UserRole, CollaboratorRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from './auth/roles.guard';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    private readonly versionService: VersionService,
    private readonly consoleGateway: ConsoleGateway,
  ) {}

  // Anti brute-force tracker for share links
  private readonly shareLinkFailedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

  private checkShareRateLimit(ip: string): void {
    const now = Date.now();
    const record = this.shareLinkFailedAttempts.get(ip);
    if (record && record.blockedUntil && record.blockedUntil > now) {
      const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      throw new HttpException(
        `Troppi tentativi falliti per i link di condivisione. Riprova tra ${waitSeconds} secondi.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedShareAttempt(ip: string): void {
    const now = Date.now();
    const record = this.shareLinkFailedAttempts.get(ip) || { count: 0, lastAttempt: now };
    
    if (now - record.lastAttempt > 15 * 60 * 1000) {
      record.count = 1;
    } else {
      record.count++;
    }
    record.lastAttempt = now;

    if (record.count >= 8) {
      record.blockedUntil = now + 15 * 60 * 1000;
      this.logger.warn(`IP ${ip} temporarily blocked for share link brute force attempts.`);
    }
    this.shareLinkFailedAttempts.set(ip, record);
  }

  private isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    return /^[a-fA-F0-9]{48,64}$/.test(token) || /^[0-9a-fA-F-]{36}$/.test(token);
  }

  @Get('mc-versions')
  async getMcVersions() {
    return this.versionService.getVersions();
  }

  @Get('servers')
  @UseGuards(AuthGuard('jwt'))
  async getServers(@Request() req) {
    const { userId } = req.user;
    
    const servers = await this.prisma.mcServer.findMany({
      where: {
        OR: [
          { owner_id: userId },
          { collaborators: { some: { user_id: userId } } }
        ]
      },
      include: {
        plan: true,
        owner: {
          select: { id: true, username: true, email: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, username: true, email: true, plan: true },
            },
          },
        },
      },
    });
    return servers.map(s => this.serializeServer(s));
  }

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

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  async getStatus(@Query('serverId') serverId: string, @Request() req) {
    const { userId, role } = req.user;
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId },
    });
    
    if (!server) {
      return { status: 'UNKNOWN' };
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      const isCollaborator = await this.prisma.serverCollaborator.findUnique({
        where: { user_id_server_id: { user_id: userId, server_id: serverId } }
      });
      if (!isCollaborator) {
        return { error: 'Forbidden' };
      }
    }

    return { status: server.status || 'UNKNOWN' };
  }

  @Post('start/:id')
  @UseGuards(AuthGuard('jwt'))
  async startServer(@Param('id') id: string, @Request() req) {
    const { userId, role } = req.user;
    try {
      const server = await this.prisma.mcServer.findUnique({
        where: { id },
        include: { plan: true },
      });
      
      if (!server) {
        return { error: 'Server not found' };
      }

      // Check access: SUPERADMIN, owner, or any collaborator (MANAGER or OPERATOR)
      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        const isCollaborator = await this.prisma.serverCollaborator.findUnique({
          where: { user_id_server_id: { user_id: userId, server_id: id } }
        });
        if (!isCollaborator) {
          throw new ForbiddenException('Non hai i permessi per avviare questo server.');
        }
      }

      // Check max running servers limit
      if (role !== UserRole.SUPERADMIN) {
        const runningServersCount = await this.prisma.mcServer.count({
          where: { owner_id: server.owner_id, status: 'RUNNING' },
        });
        const maxRunning = server.plan.max_running_servers || 1;
        if (runningServersCount >= maxRunning) {
          return { error: 'Limit reached', details: `Il tuo piano attuale permette un massimo di ${maxRunning} server in esecuzione contemporaneamente.` };
        }
      }

      if (!server.port) {
        // Get available port
        const port = await this.getAvailablePort();
        await this.prisma.mcServer.update({
          where: { id },
          data: { port },
        });
        server.port = port;
      }

      // Notify websocket: STARTING
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STARTING' },
      });
      this.consoleGateway.broadcastServerStatus(id, 'STARTING', server.port);

      // Get properties for the server
      const settings = await this.prisma.serverSetting.findMany({
        where: { server_id: id },
      });
      const properties: Record<string, string> = {};
      for (const setting of settings) {
        properties[setting.key] = setting.value;
      }

      // Inject allocated limits
      const ramMb = server.allocated_ram_mb || 2048;
      const cpuCores = server.allocated_cpu_cores || 1.0;

      const result = await this.dockerService.startMinecraftServer(id, server.port, properties, {
        ramMb,
        cpuCores,
        mcType: server.mc_type,
        mcVersion: server.mc_version,
      });

      // Save RCON credentials if they were generated
      const updateData: any = {
        status: 'RUNNING',
        last_started_at: new Date(),
      };
      if (result.rconPassword) {
        updateData.rcon_password = result.rconPassword;
        updateData.rcon_port = result.rconPort || 25575;
      }
      await this.prisma.mcServer.update({
        where: { id },
        data: updateData,
      });

      // Notify websocket: RUNNING
      this.consoleGateway.broadcastServerStatus(id, 'RUNNING', server.port);

      return { success: true, status: 'RUNNING', port: server.port };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Error starting server:', error);
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'ERROR' },
      }).catch(() => {});
      this.consoleGateway.broadcastServerStatus(id, 'ERROR', null);
      return { error: 'Failed to start server', details: error.message };
    }
  }

  @Post('stop/:id')
  @UseGuards(AuthGuard('jwt'))
  async stopServer(@Param('id') id: string, @Request() req) {
    const { userId, role } = req.user;
    try {
      const server = await this.prisma.mcServer.findUnique({
        where: { id },
      });

      if (!server) {
        return { error: 'Server not found' };
      }

      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        const isCollaborator = await this.prisma.serverCollaborator.findUnique({
          where: { user_id_server_id: { user_id: userId, server_id: id } }
        });
        if (!isCollaborator) {
          throw new ForbiddenException('Non hai i permessi per fermare questo server.');
        }
      }

      // Notify websocket: STOPPING
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STOPPING' },
      });
      this.consoleGateway.broadcastServerStatus(id, 'STOPPING', server.port);

      await this.dockerService.stopMinecraftServer(id);
      
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STOPPED', last_stopped_at: new Date() },
      });

      // Notify websocket: STOPPED
      this.consoleGateway.broadcastServerStatus(id, 'STOPPED', server.port);

      return { success: true, status: 'STOPPED' };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Error stopping server:', error);
      return { error: 'Failed to stop server', details: error.message };
    }
  }

  @Post('restart/:id')
  @UseGuards(AuthGuard('jwt'))
  async restartServer(@Param('id') id: string, @Request() req) {
    const { userId, role } = req.user;
    try {
      const server = await this.prisma.mcServer.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!server) {
        return { error: 'Server not found' };
      }

      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        const isCollaborator = await this.prisma.serverCollaborator.findUnique({
          where: { user_id_server_id: { user_id: userId, server_id: id } }
        });
        if (!isCollaborator) {
          throw new ForbiddenException('Non hai i permessi per riavviare questo server.');
        }
      }

      this.logger.log(`Restarting server ${id}...`);

      // 1. Graceful stop
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STOPPING' },
      });
      this.consoleGateway.broadcastServerStatus(id, 'STOPPING', server.port);

      try {
        await this.dockerService.stopMinecraftServer(id);
      } catch (e) {
        this.logger.warn(`Stop before restart non bloccante: ${e.message}`);
      }

      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STOPPED', last_stopped_at: new Date() },
      });
      this.consoleGateway.broadcastServerStatus(id, 'STOPPED', server.port);

      // 2. Start
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STARTING' },
      });
      this.consoleGateway.broadcastServerStatus(id, 'STARTING', server.port);

      if (!server.port) {
        const port = await this.getAvailablePort();
        await this.prisma.mcServer.update({
          where: { id },
          data: { port },
        });
        server.port = port;
      }

      const settings = await this.prisma.serverSetting.findMany({
        where: { server_id: id },
      });
      const properties: Record<string, string> = {};
      for (const setting of settings) {
        properties[setting.key] = setting.value;
      }

      const ramMb = server.allocated_ram_mb || 2048;
      const cpuCores = server.allocated_cpu_cores || 1.0;

      const result = await this.dockerService.startMinecraftServer(id, server.port, properties, {
        ramMb,
        cpuCores,
        mcType: server.mc_type,
        mcVersion: server.mc_version,
      });

      const updateData: any = {
        status: 'RUNNING',
        last_started_at: new Date(),
      };
      if (result.rconPassword) {
        updateData.rcon_password = result.rconPassword;
        updateData.rcon_port = result.rconPort || 25575;
      }
      await this.prisma.mcServer.update({
        where: { id },
        data: updateData,
      });

      this.consoleGateway.broadcastServerStatus(id, 'RUNNING', server.port);

      return { success: true, status: 'RUNNING', port: server.port };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Error restarting server:', error);
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'ERROR' },
      }).catch(() => {});
      this.consoleGateway.broadcastServerStatus(id, 'ERROR', null);
      return { error: 'Failed to restart server', details: error.message };
    }
  }

  @Delete('servers/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteServer(@Param('id') id: string, @Request() req) {
    const { userId, role } = req.user;
    try {
      this.logger.log(`Attempting to delete server with ID: ${id}`);
      
      // Valida formato UUID (8-4-4-4-12 hex characters)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        this.logger.warn(`Invalid UUID format received: ${id}`);
        return { 
          error: 'Invalid ID format', 
          details: `L'ID fornito (${id}) non è un UUID valido. Deve essere nel formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.` 
        };
      }

      // Verifica che il server esista
      const server = await this.prisma.mcServer.findUnique({
        where: { id },
      });

      if (!server) {
        return { error: 'Server not found', details: `Server with ID ${id} does not exist` };
      }

      // Check ownership
      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        return { error: 'Forbidden', details: 'You do not own this server' };
      }

      // Stop container if running
      try {
        await this.dockerService.stopMinecraftServer(id);
      } catch (e) {
        // Container might not exist, ignore
      }

      await this.prisma.mcServer.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting server:', error);
      return { error: 'Failed to delete server', details: error.message };
    }
  }

  @Post('servers/bulk-delete')
  @UseGuards(AuthGuard('jwt'))
  async bulkDeleteServers(@Body() body: { serverIds: string[] }, @Request() req) {
    const { userId, role } = req.user;
    const { serverIds } = body;
    
    if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
      throw new BadRequestException('serverIds deve essere un array non vuoto');
    }

    try {
      let deleted = 0;
      for (const id of serverIds) {
        const server = await this.prisma.mcServer.findUnique({
          where: { id },
        });

        if (!server) continue;

        if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
          throw new ForbiddenException(`Non sei autorizzato ad eliminare il server ${id}`);
        }

        // Stop container if running
        try {
          await this.dockerService.stopMinecraftServer(id);
        } catch (e) {
          // Container might not exist, ignore
        }

        await this.prisma.mcServer.delete({
          where: { id },
        });
        deleted++;
      }

      return { success: true, deleted };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error bulk deleting servers:', error);
      return { error: 'Failed to delete servers', details: error.message };
    }
  }

  @Get('properties')
  @UseGuards(AuthGuard('jwt'))
  async getProperties(@Query('serverId') serverId: string, @Request() req) {
    const { userId, role } = req.user;
    if (!serverId) {
      throw new BadRequestException('serverId query parameter is required');
    }
    try {
      // Check if server exists
      const server = await this.prisma.mcServer.findUnique({
        where: { id: serverId },
      });

      if (!server) {
        throw new NotFoundException('Server non trovato');
      }

      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        const collaborator = await this.prisma.serverCollaborator.findUnique({
          where: { user_id_server_id: { user_id: userId, server_id: serverId } },
          include: { user: { include: { plan: true } } },
        });
        if (!collaborator) {
          throw new ForbiddenException('Non sei un collaboratore di questo server');
        }
        if (collaborator.role !== CollaboratorRole.MANAGER || !collaborator.user?.plan?.can_edit_shared_servers) {
          throw new ForbiddenException('I collaboratori con ruolo OPERATOR o senza piano abilitato non possono visualizzare le proprietà del server.');
        }
      }

      // Try to read from database settings first
      const settings = await this.prisma.serverSetting.findMany({
        where: { server_id: serverId },
      });

      // Convert settings to properties object
      const properties: Record<string, any> = {};
      for (const setting of settings) {
        properties[setting.key] = setting.value;
      }

      // If no settings found, return default properties
      if (Object.keys(properties).length === 0) {
        return { 
          properties: this.getDefaultProperties(), 
          isRunning: server.status === 'RUNNING',
          mcType: server.mc_type 
        };
      }

      return {
        serverId,
        properties,
        isRunning: server.status === 'RUNNING',
        mcType: server.mc_type,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting properties:', error);
      return { error: 'Failed to get properties', details: error.message };
    }
  }

  @Post('properties')
  @UseGuards(AuthGuard('jwt'))
  async saveProperties(@Body() body: { serverId: string; properties: Record<string, any> }, @Request() req) {
    const { userId, role } = req.user;
    const { serverId, properties } = body;
    
    if (!serverId || !properties) {
      throw new BadRequestException('serverId e properties sono obbligatori');
    }

    try {
      // Check if server exists
      const server = await this.prisma.mcServer.findUnique({
        where: { id: serverId },
      });

      if (!server) {
        throw new NotFoundException('Server non trovato');
      }

      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        const collaborator = await this.prisma.serverCollaborator.findUnique({
          where: { user_id_server_id: { user_id: userId, server_id: serverId } },
          include: { user: { include: { plan: true } } },
        });
        if (!collaborator) {
          throw new ForbiddenException('Non sei un collaboratore di questo server');
        }
        if (collaborator.role !== CollaboratorRole.MANAGER || !collaborator.user?.plan?.can_edit_shared_servers) {
          throw new ForbiddenException('I collaboratori con ruolo OPERATOR o senza piano abilitato non possono modificare le proprietà del server.');
        }
      }

      // Save each property to database
      for (const [key, value] of Object.entries(properties)) {
        await this.prisma.serverSetting.upsert({
          where: {
            server_id_key: {
              server_id: serverId,
              key: key,
            },
          },
          update: {
            value: String(value),
            updated_at: new Date(),
          },
          create: {
            server_id: serverId,
            key: key,
            value: String(value),
            category: 'gameplay', // Default category
          },
        });
      }

      this.logger.log(`Saved ${Object.keys(properties).length} properties for server ${serverId}`);

      // Update the server.properties file using the existing DockerService method
      const updateResult = await this.dockerService.updateServerProperties(serverId, properties);
      
      // Real-time sync: broadcast settings changed to room
      this.consoleGateway.broadcastServerSettings(serverId);

      return {
        success: true,
        serverId,
        savedCount: Object.keys(properties).length,
        writtenToContainer: updateResult.writtenToContainer,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error saving properties:', error);
      return { error: 'Failed to save properties', details: error.message };
    }
  }

  @Post('setup-test-data')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  async setupTestData() {
    try {
      // Create a test plan with a unique name
      const plan = await this.prisma.plan.create({
        data: {
          name: 'test-plan-' + Math.random().toString(36).substring(2, 11),
          max_servers: 1,
          ram_mb: 2048,
          cpu_cores: 2.0,
          storage_gb: 10,
          max_players: 20,
          daily_uptime_hours: 24,
          backup_max_stored: 5,
          backup_frequency_hours: 24,
          queue_enabled: false,
        },
      });

      // Create a test user with a unique username and email
      const user = await this.prisma.user.create({
        data: {
          username: 'testuser-' + Math.random().toString(36).substring(2, 11),
          email: 'test-' + Math.random().toString(36).substring(2, 11) + '@example.com',
          password_hash: 'password',
          role: UserRole.USER,
          plan_id: plan.id,
        },
      });

      return { success: true, plan, user };
    } catch (error) {
      this.logger.error('Error setting up test data:', error);
      return { error: 'Failed to setup test data', details: error.message };
    }
  }

  @Post('servers')
  @UseGuards(AuthGuard('jwt'))
  async createServer(@Body() body: {
    name: string;
    subdomain?: string;
    mc_type: string;
    mc_version: string;
    owner_id?: string;
    plan_id?: string;
    allocated_ram_mb?: number;
    allocated_cpu_cores?: number;
  }, @Request() req) {
    const { userId, role } = req.user;
    try {
      // Validate required fields
      if (!body.name || !body.mc_type || !body.mc_version) {
        return { error: 'Missing required fields', details: 'name, mc_type, and mc_version are required' };
      }

      // If owner_id or plan_id not provided, use current user info
      let ownerId: string = role === UserRole.SUPERADMIN ? (body.owner_id || userId) : userId;
      let planId: string | undefined = body.plan_id;

      if (!planId) {
        const user = await this.prisma.user.findUnique({
          where: { id: ownerId },
        });
        planId = user?.plan_id || undefined;
      }

      // If still no planId (e.g. SuperAdmin), get the first available plan
      if (!planId) {
        const defaultPlan = await this.prisma.plan.findFirst({
          orderBy: { ram_mb: 'asc' },
        });
        planId = defaultPlan?.id;
      }

      // Ensure ownerId and planId are strings
      if (!ownerId || !planId) {
        return { error: 'Failed to get or create user/plan' };
      }

      // Check max servers limit
      let allocated_ram_mb = body.allocated_ram_mb || 2048;
      let allocated_cpu_cores = body.allocated_cpu_cores || 1.0;

      if (role !== UserRole.SUPERADMIN) {
        const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        
        // Count existing servers
        const existingServersCount = await this.prisma.mcServer.count({ where: { owner_id: ownerId } });
        if (plan && existingServersCount >= plan.max_servers) {
          return { error: 'Limit reached', details: `Hai raggiunto il numero massimo di server (${plan.max_servers}) consentito dal tuo piano.` };
        }

        // Check global resource pool limits
        if (plan) {
          const userServers = await this.prisma.mcServer.findMany({ where: { owner_id: ownerId } });
          const totalRamAllocated = userServers.reduce((sum, s) => sum + (s.allocated_ram_mb || 0), 0);
          const totalCpuAllocated = userServers.reduce((sum, s) => sum + (s.allocated_cpu_cores || 0), 0);

          if (totalRamAllocated + allocated_ram_mb > plan.ram_mb) {
            return { 
              error: 'Limit reached', 
              details: `Memoria insufficiente nel tuo pool globale. Hai a disposizione ancora ${plan.ram_mb - totalRamAllocated} MB di RAM sui ${plan.ram_mb} MB totali.` 
            };
          }
          if (totalCpuAllocated + allocated_cpu_cores > plan.cpu_cores) {
            return { 
              error: 'Limit reached', 
              details: `Core CPU insufficienti nel tuo pool globale. Hai a disposizione ancora ${plan.cpu_cores - totalCpuAllocated} core sui ${plan.cpu_cores} totali.` 
            };
          }
        }
      }

      // Generate a unique name and subdomain if not provided
      const baseName = body.name.trim();
      const uniqueId = uuidv4().slice(0, 8);
      const name = baseName;
      const subdomain = (body.subdomain || baseName.toLowerCase().replace(/\s+/g, '-')).substring(0, 50) + `-${uniqueId}`;

      // Check for subdomain uniqueness before creation
      const existingSubdomain = await this.prisma.mcServer.findUnique({
        where: { subdomain },
      });

      if (existingSubdomain) {
        return { 
          error: 'Subdomain already in use', 
          details: `The generated subdomain ${subdomain} is already taken. Please try again.` 
        };
      }

      const server = await this.prisma.mcServer.create({
        data: {
          name: name,
          subdomain: subdomain,
          mc_type: body.mc_type as any,
          mc_version: body.mc_version,
          owner_id: ownerId,
          plan_id: planId,
          allocated_ram_mb,
          allocated_cpu_cores,
          settings: {
            create: [
              { key: 'white-list', value: 'false', category: 'gameplay' },
              { key: 'online-mode', value: 'true', category: 'security' },
              { key: 'enable-rcon', value: 'true', category: 'advanced' },
              { key: 'rcon.port', value: '25575', category: 'advanced' },
            ]
          }
        },
      });
      return { success: true, server: this.serializeServer(server) };
    } catch (error) {
      this.logger.error('Error creating server:', error);
      return { error: 'Failed to create server', details: error.message, stack: error.stack?.toString() };
    }
  }

  // Helper method to create or get default test user and plan
  private async createOrGetDefaultUserAndPlan() {
    try {
      // Try to find existing default user
      const existingUser = await this.prisma.user.findFirst({
        where: { email: 'test@openhostmc.local' },
        include: { plan: true },
      });

      if (existingUser && existingUser.plan_id) {
        this.logger.log('Found existing test user and plan');
        return { userId: existingUser.id, planId: existingUser.plan_id as string };
      }

      // Create default plan if not exists
      this.logger.log('Creating default test plan...');
      const defaultPlan = await this.prisma.plan.create({
        data: {
          name: 'test-free-plan',
          max_servers: 5,
          ram_mb: 2048,
          cpu_cores: 2.0,
          storage_gb: 10,
          max_players: 20,
          daily_uptime_hours: 24,
          backup_max_stored: 5,
          backup_frequency_hours: 24,
          queue_enabled: false,
        },
      });

      // Create default test user
      this.logger.log('Creating default test user...');
      const defaultUser = await this.prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@openhostmc.local',
          password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6', // 'password123'
          role: UserRole.USER,
          verified: true,
          plan_id: defaultPlan.id,
        },
      });

      this.logger.log(`Created default test user: ${defaultUser.id} with plan: ${defaultPlan.id}`);
      return { userId: defaultUser.id, planId: defaultPlan.id };

    } catch (error) {
      this.logger.error('Error creating default user and plan:', error);
      throw error;
    }
  }

  private async getAvailablePort(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      // Find a port pool entry that's not allocated
      const availablePort = await tx.portPool.findFirst({
        where: { allocated_at: null },
        orderBy: { port: 'asc' },
      });
      
      if (!availablePort) {
        // Fallback: generate random port between 25566 and 30000
        return Math.floor(Math.random() * (30000 - 25566 + 1)) + 25566;
      }

      await tx.portPool.update({
        where: { port: availablePort.port },
        data: { allocated_at: new Date() },
      });
      
      return availablePort.port;
    });
  }

  private parsePropertiesFile(content: string): Record<string, any> {
    const lines = content.split('\n');
    const result: Record<string, any> = {};
    for (const line of lines) {
      if (line.startsWith('#') || line.trim() === '') continue;
      const [key, ...rest] = line.split('=');
      if (key) {
        let rawValue = rest.join('=');
        let parsedValue: any = rawValue;
        if (rawValue === 'true') parsedValue = true;
        else if (rawValue === 'false') parsedValue = false;
        else if (!isNaN(Number(rawValue)) && rawValue !== '') parsedValue = Number(rawValue);
        result[key.trim()] = parsedValue;
      }
    }
    return result;
  }

  private getDefaultProperties(): Record<string, string> {
    return {
      'accepts-transfers': 'false', 'allow-flight': 'false', 'allow-nether': 'true',
      'broadcast-console-to-ops': 'true', 'broadcast-rcon-to-ops': 'true', 'bug-report-link': '',
      'difficulty': 'easy', 'enable-command-block': 'false', 'enable-jmx-monitoring': 'false',
      'enable-query': 'false', 'enable-rcon': 'false', 'enable-status': 'true',
      'enforce-secure-profile': 'true', 'enforce-whitelist': 'false',
      'entity-broadcast-range-percentage': '100', 'force-gamemode': 'false',
      'function-permission-level': '2', 'gamemode': 'survival', 'generate-structures': 'true',
      'generator-settings': '{}', 'hardcore': 'false', 'hide-online-players': 'false',
      'initial-disabled-packs': '', 'initial-enabled-packs': 'vanilla', 'level-name': 'world',
      'level-seed': '', 'level-type': 'minecraft:normal', 'log-ips': 'true',
      'max-chained-neighbor-updates': '1000000', 'max-players': '20', 'max-tick-time': '60000',
      'max-world-size': '29999984', 'motd': 'A Minecraft Server', 'network-compression-threshold': '256',
      'online-mode': 'true', 'op-permission-level': '4', 'pause-when-empty-seconds': '60',
      'player-idle-timeout': '0', 'prevent-proxy-connections': 'false', 'pvp': 'true',
      'query.port': '25565', 'rate-limit': '0', 'rcon.password': '', 'rcon.port': '25575',
      'region-file-compression': 'deflate', 'require-resource-pack': 'false', 'resource-pack': '',
      'resource-pack-id': '', 'resource-pack-prompt': '', 'resource-pack-sha1': '',
      'server-ip': '', 'server-port': '25565', 'simulation-distance': '10', 'spawn-monsters': 'true',
      'spawn-protection': '16', 'sync-chunk-writes': 'true', 'text-filtering-config': '',
      'text-filtering-version': '0', 'use-native-transport': 'true', 'view-distance': '10',
      'white-list': 'false'
    };
  }

  @Post('servers/:id/share')
  @UseGuards(AuthGuard('jwt'))
  async createShareLink(
    @Param('id') id: string,
    @Body() body: { role?: CollaboratorRole; expiresInDays?: number; maxUses?: number },
    @Request() req,
  ) {
    const { userId, role } = req.user;
    try {
      const server = await this.prisma.mcServer.findUnique({ where: { id } });
      if (!server) throw new NotFoundException('Server non trovato');
      
      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        throw new ForbiddenException('Solo il proprietario o un SUPERADMIN possono creare un link di condivisione');
      }

      // Cryptographically secure token (32 bytes = 64 hex characters = 256 bits of entropy)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresInDays = body?.expiresInDays && Number(body.expiresInDays) > 0 ? Math.min(Number(body.expiresInDays), 30) : 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const maxUses = body?.maxUses !== undefined && Number(body.maxUses) > 0 ? Number(body.maxUses) : 100;
      const targetRole = body?.role === CollaboratorRole.MANAGER ? CollaboratorRole.MANAGER : CollaboratorRole.OPERATOR;

      const shareLink = await this.prisma.serverShareLink.create({
        data: {
          server_id: id,
          token,
          role: targetRole,
          expires_at: expiresAt,
          uses: 0,
          max_uses: maxUses,
          revoked: false,
        },
      });

      return {
        success: true,
        token: shareLink.token,
        role: shareLink.role,
        expires_at: shareLink.expires_at,
        max_uses: shareLink.max_uses,
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error creating share link:', error);
      return { error: 'Failed to create share link', details: error.message };
    }
  }

  @Post('servers/share/:token/revoke')
  @Delete('servers/share/:token')
  @UseGuards(AuthGuard('jwt'))
  async revokeShareLinkByToken(@Param('token') token: string, @Request() req) {
    const { userId, role } = req.user;
    if (!this.isValidTokenFormat(token)) {
      throw new BadRequestException('Formato token non valido');
    }

    const link = await this.prisma.serverShareLink.findUnique({
      where: { token },
      include: { server: true },
    });

    if (!link) {
      throw new NotFoundException('Link di condivisione non trovato');
    }

    if (role !== UserRole.SUPERADMIN && link.server.owner_id !== userId) {
      throw new ForbiddenException('Solo il proprietario del server o un SUPERADMIN possono revocare questo link');
    }

    await this.prisma.serverShareLink.update({
      where: { token },
      data: { revoked: true },
    });

    return { success: true, message: 'Link di condivisione revocato con successo' };
  }

  @Get('servers/share/:token')
  async getShareLinkInfo(@Param('token') token: string, @Req() req: any) {
    const ip = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    this.checkShareRateLimit(ip);

    if (!this.isValidTokenFormat(token)) {
      this.recordFailedShareAttempt(ip);
      return { error: 'Token non valido', isValid: false };
    }

    try {
      const link = await this.prisma.serverShareLink.findUnique({
        where: { token },
        include: {
          server: {
            include: {
              owner: { select: { id: true, username: true } },
              plan: true,
            },
          },
        },
      });

      if (!link) {
        this.recordFailedShareAttempt(ip);
        return { error: 'Link non valido o inesistente', isValid: false };
      }
      
      if (link.revoked) {
        return { error: 'Link di condivisione revocato', isValid: false, isRevoked: true };
      }

      const isExpired = link.expires_at ? link.expires_at < new Date() : false;
      const isExhausted = link.max_uses !== null && link.uses >= link.max_uses;
      const isValid = !isExpired && !isExhausted;

      if (!isValid) {
        return {
          error: isExpired ? 'Link scaduto' : 'Link non più valido: limite utilizzi raggiunto',
          isValid: false,
          serverName: link.server.name,
          ownerName: link.server.owner.username,
          mcVersion: link.server.mc_version,
          mcType: link.server.mc_type,
        };
      }

      return { 
        success: true, 
        isValid: true,
        serverName: link.server.name,
        ownerName: link.server.owner.username,
        mcType: link.server.mc_type,
        mcVersion: link.server.mc_version,
        planName: link.server.plan?.name || 'Standard',
        expiresAt: link.expires_at,
        role: link.role,
        uses: link.uses,
        maxUses: link.max_uses,
      };
    } catch (error) {
      return { error: 'Errore durante il recupero delle informazioni del link', isValid: false };
    }
  }

  @Post('servers/share/:token/accept')
  @UseGuards(AuthGuard('jwt'))
  async acceptShareLink(@Param('token') token: string, @Request() req) {
    const { userId } = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    this.checkShareRateLimit(ip);

    if (!this.isValidTokenFormat(token)) {
      this.recordFailedShareAttempt(ip);
      throw new BadRequestException('Formato token di condivisione non valido');
    }

    try {
      const link = await this.prisma.serverShareLink.findUnique({
        where: { token },
        include: { server: true },
      });

      if (!link) {
        this.recordFailedShareAttempt(ip);
        throw new NotFoundException('Link di condivisione non valido o inesistente');
      }

      if (link.revoked) {
        throw new BadRequestException('Questo link di condivisione è stato revocato');
      }

      if (link.expires_at && link.expires_at < new Date()) {
        throw new BadRequestException('Link di condivisione scaduto');
      }

      if (link.max_uses !== null && link.uses >= link.max_uses) {
        throw new BadRequestException('Limite massimo di utilizzi per questo link raggiunto');
      }

      // Controlla se è il proprietario
      if (link.server.owner_id === userId) {
        throw new BadRequestException('Sei già il proprietario di questo server');
      }

      // Determina il ruolo prevenendo escalation di privilegi
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true },
      });

      if (!user) {
        throw new NotFoundException('Utente non trovato');
      }

      const canEdit = user.plan?.can_edit_shared_servers === true;
      // Strict Privilege Escalation Protection:
      // Even if the share link invited with role MANAGER, if the accepting user's plan does not allow editing shared servers,
      // the granted role is capped at OPERATOR!
      const targetRole = link.role === CollaboratorRole.MANAGER ? CollaboratorRole.MANAGER : CollaboratorRole.OPERATOR;
      const assignedRole = (targetRole === CollaboratorRole.MANAGER && canEdit)
        ? CollaboratorRole.MANAGER
        : CollaboratorRole.OPERATOR;

      // Aggiungi o aggiorna il collaboratore
      const collaborator = await this.prisma.serverCollaborator.upsert({
        where: {
          user_id_server_id: {
            user_id: userId,
            server_id: link.server_id,
          },
        },
        update: {
          role: assignedRole,
        },
        create: {
          user_id: userId,
          server_id: link.server_id,
          role: assignedRole,
        },
      });

      // Incrementa il conteggio utilizzi del link
      await this.prisma.serverShareLink.update({
        where: { id: link.id },
        data: { uses: { increment: 1 } },
      });

      return {
        success: true,
        serverId: link.server_id,
        role: collaborator.role,
        canEdit: collaborator.role === CollaboratorRole.MANAGER,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error accepting share link:', error);
      return { error: "Errore durante l'accettazione del link", details: error.message };
    }
  }

  @Get('servers/:id/collaborators')
  @UseGuards(AuthGuard('jwt'))
  async getServerCollaborators(@Param('id') id: string, @Request() req) {
    const { userId, role } = req.user;
    const server = await this.prisma.mcServer.findUnique({
      where: { id },
      include: {
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                plan: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Server non trovato');
    }

    // Solo Owner, SUPERADMIN e MANAGER possono visualizzare
    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      const myCollab = server.collaborators.find((c) => c.user_id === userId);
      if (!myCollab || myCollab.role !== CollaboratorRole.MANAGER) {
        throw new ForbiddenException('Non autorizzato a visualizzare i collaboratori: richiesto ruolo MANAGER o proprietario.');
      }
    }

    return {
      success: true,
      owner: server.owner,
      collaborators: server.collaborators.map((c) => ({
        id: c.user.id,
        collaboratorId: c.id,
        username: c.user.username,
        email: c.user.email,
        role: c.role,
        plan_name: c.user.plan?.name || 'Free',
        can_edit_shared_servers: c.user.plan?.can_edit_shared_servers || false,
        created_at: (c.created_at instanceof Date ? c.created_at : new Date(c.created_at || Date.now())).toISOString(),
      })),
    };
  }

  @Delete('servers/:id/collaborators/:targetUserId')
  @UseGuards(AuthGuard('jwt'))
  async removeCollaborator(
    @Param('id') serverId: string,
    @Param('targetUserId') targetUserId: string,
    @Request() req,
  ) {
    const { userId, role } = req.user;
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server non trovato');
    }

    // Solo Owner e SUPERADMIN possono rimuovere un collaboratore
    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new ForbiddenException('Solo il proprietario o un SUPERADMIN possono rimuovere un collaboratore');
    }

    await this.prisma.serverCollaborator.deleteMany({
      where: {
        server_id: serverId,
        user_id: targetUserId,
      },
    });

    return { success: true, message: 'Collaboratore rimosso con successo' };
  }

  @Patch('servers/:id/collaborators/:targetUserId')
  @UseGuards(AuthGuard('jwt'))
  async updateCollaboratorRole(
    @Param('id') serverId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() body: { role: CollaboratorRole },
    @Request() req,
  ) {
    const { userId, role } = req.user;
    const { role: newRole } = body;

    if (!newRole || !Object.values(CollaboratorRole).includes(newRole)) {
      throw new BadRequestException(`Ruolo non valido. Valori ammessi: ${Object.values(CollaboratorRole).join(', ')}`);
    }

    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server non trovato');
    }

    // Solo Owner e SUPERADMIN possono modificare i ruoli
    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new ForbiddenException('Solo il proprietario o un SUPERADMIN possono modificare i ruoli dei collaboratori');
    }

    const collaborator = await this.prisma.serverCollaborator.findUnique({
      where: {
        user_id_server_id: {
          user_id: targetUserId,
          server_id: serverId,
        },
      },
      include: { user: { include: { plan: true } } },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaboratore non trovato per questo server');
    }

    // Se promosso a MANAGER, controlla che il suo piano lo consenta
    if (newRole === CollaboratorRole.MANAGER) {
      if (!collaborator.user.plan || !collaborator.user.plan.can_edit_shared_servers) {
        throw new BadRequestException('Impossibile assegnare il ruolo MANAGER: il piano dell\'utente non consente la modifica di server condivisi (can_edit_shared_servers disabilitato).');
      }
    }

    const updated = await this.prisma.serverCollaborator.update({
      where: {
        user_id_server_id: {
          user_id: targetUserId,
          server_id: serverId,
        },
      },
      data: { role: newRole },
    });

    return {
      success: true,
      collaborator: {
        id: updated.id,
        userId: updated.user_id,
        serverId: updated.server_id,
        role: updated.role,
      },
    };
  }

  @Get('servers/:id/share-links')
  @UseGuards(AuthGuard('jwt'))
  async getShareLinks(@Param('id') serverId: string, @Request() req) {
    const { userId, role } = req.user;
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server non trovato');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new ForbiddenException('Solo il proprietario o un SUPERADMIN possono visualizzare i link di condivisione');
    }

    const links = await this.prisma.serverShareLink.findMany({
      where: { server_id: serverId },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();
    return {
      success: true,
      links: links.map((link) => {
        const isExpired = link.expires_at ? link.expires_at < now : false;
        const isExhausted = link.max_uses !== null && link.uses >= link.max_uses;
        return {
          id: link.id,
          token: link.token,
          created_at: (link.created_at instanceof Date ? link.created_at : new Date(link.created_at || Date.now())).toISOString(),
          expires_at: link.expires_at ? (link.expires_at instanceof Date ? link.expires_at : new Date(link.expires_at)).toISOString() : null,
          uses: link.uses,
          max_uses: link.max_uses,
          role: link.role,
          revoked: link.revoked,
          is_active: !isExpired && !isExhausted && !link.revoked,
        };
      }),
    };
  }

  @Delete('servers/:id/share-links/:linkId')
  @UseGuards(AuthGuard('jwt'))
  async revokeShareLink(
    @Param('id') serverId: string,
    @Param('linkId') linkId: string,
    @Request() req,
  ) {
    const { userId, role } = req.user;
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server non trovato');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new ForbiddenException('Solo il proprietario o un SUPERADMIN possono revocare i link di condivisione');
    }

    const link = await this.prisma.serverShareLink.findFirst({
      where: { id: linkId, server_id: serverId },
    });

    if (!link) {
      throw new NotFoundException('Link di condivisione non trovato');
    }

    await this.prisma.serverShareLink.delete({
      where: { id: link.id },
    });

    return { success: true, message: 'Link di condivisione revocato con successo' };
  }
}
