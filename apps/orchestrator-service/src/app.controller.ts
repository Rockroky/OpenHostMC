import { Controller, Get, Post, Delete, Body, Param, Query, Logger, UseGuards, Request, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DockerService } from './docker.service';
import { VersionService } from './version.service';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './auth/roles.guard';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
    private readonly versionService: VersionService,
  ) {}

  @Get('mc-versions')
  async getMcVersions() {
    return this.versionService.getVersions();
  }

  @Get('servers')
  @UseGuards(AuthGuard('jwt'))
  async getServers(@Request() req) {
    const { userId } = req.user;
    
    const where = { owner_id: userId };

    const servers = await this.prisma.mcServer.findMany({
      where,
      include: { plan: true },
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
      return { error: 'Forbidden' };
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

      // Check ownership
      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        return { error: 'Forbidden', details: 'You do not own this server' };
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

      // Get properties for the server
      const settings = await this.prisma.serverSetting.findMany({
        where: { server_id: id },
      });
      const properties: Record<string, string> = {};
      for (const setting of settings) {
        properties[setting.key] = setting.value;
      }

      // Inject plan limits
      const ramMb = server.plan.ram_mb || 2048;
      const cpuCores = server.plan.cpu_cores || 1.0;

      const result = await this.dockerService.startMinecraftServer(id, server.port, properties, {
        ramMb,
        cpuCores,
        mcType: server.mc_type,
        mcVersion: server.mc_version,
      });

      // Save RCON credentials if they were generated
      if (result.rconPassword) {
        await this.prisma.mcServer.update({
          where: { id },
          data: {
            status: 'RUNNING',
            rcon_password: result.rconPassword,
            rcon_port: result.rconPort || 25575,
          },
        });
      } else {
        await this.prisma.mcServer.update({
          where: { id },
          data: { status: 'RUNNING' },
        });
      }

      return { success: true, status: 'RUNNING' };
    } catch (error) {
      this.logger.error('Error starting server:', error);
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
        return { error: 'Forbidden', details: 'You do not own this server' };
      }

      await this.dockerService.stopMinecraftServer(id);
      
      await this.prisma.mcServer.update({
        where: { id },
        data: { status: 'STOPPED' },
      });

      return { success: true, status: 'STOPPED' };
    } catch (error) {
      this.logger.error('Error stopping server:', error);
      return { error: 'Failed to stop server', details: error.message };
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
  async bulkDeleteServers(@Body() body: { serverIds: string[] }) {
    const { serverIds } = body;
    
    try {
      for (const id of serverIds) {
        // Stop container if running
        try {
          await this.dockerService.stopMinecraftServer(id);
        } catch (e) {
          // Container might not exist, ignore
        }

        await this.prisma.mcServer.delete({
          where: { id },
        });
      }

      return { success: true, deleted: serverIds.length };
    } catch (error) {
      this.logger.error('Error bulk deleting servers:', error);
      return { error: 'Failed to delete servers', details: error.message };
    }
  }

  @Get('properties')
  @UseGuards(AuthGuard('jwt'))
  async getProperties(@Query('serverId') serverId: string, @Request() req) {
    const { userId, role } = req.user;
    try {
      // Check if server exists
      const server = await this.prisma.mcServer.findUnique({
        where: { id: serverId },
      });

      if (!server) {
        throw new NotFoundException('Server non trovato');
      }

      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        throw new UnauthorizedException();
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
        return { properties: this.getDefaultProperties(), isRunning: server.status === 'RUNNING' };
      }

      return {
        serverId,
        properties,
        isRunning: server.status === 'RUNNING',
      };
    } catch (error) {
      this.logger.error('Error getting properties:', error);
      return { error: 'Failed to get properties', details: error.message };
    }
  }

  @Post('properties')
  @UseGuards(AuthGuard('jwt'))
  async saveProperties(@Body() body: { serverId: string; properties: Record<string, any> }, @Request() req) {
    const { userId, role } = req.user;
    const { serverId, properties } = body;
    
    try {
      // Check if server exists
      const server = await this.prisma.mcServer.findUnique({
        where: { id: serverId },
      });

      if (!server) {
        throw new NotFoundException();
      }

      if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
        throw new UnauthorizedException();
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
            value: value,
            updated_at: new Date(),
          },
          create: {
            server_id: serverId,
            key: key,
            value: value,
            category: 'gameplay', // Default category
          },
        });
      }

      this.logger.log(`Saved ${Object.keys(properties).length} properties for server ${serverId}`);

      // Update the server.properties file using the existing DockerService method
      const updateResult = await this.dockerService.updateServerProperties(serverId, properties);
      
      return {
        success: true,
        serverId,
        savedCount: Object.keys(properties).length,
        writtenToContainer: updateResult.writtenToContainer,
      };
    } catch (error) {
      this.logger.error('Error saving properties:', error);
      return { error: 'Failed to save properties', details: error.message };
    }
  }

  @Post('setup-test-data')
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

      // Generate a unique name and subdomain if not provided
      const baseName = body.name.trim();
      const uniqueId = uuidv4().slice(0, 8);
      const name = `${baseName}-${uniqueId}`;
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
}
