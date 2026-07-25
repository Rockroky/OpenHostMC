import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DockerService } from './docker.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class ServerPropertiesService {
  private readonly logger = new Logger(ServerPropertiesService.name);
  
  // All 70+ server.properties fields with their types and RCON applicability
  private readonly PROPERTY_SCHEMA = {
    // Boolean properties
    'accepts-transfers': { type: 'boolean', rcon: false },
    'allow-flight': { type: 'boolean', rcon: true },
    'allow-nether': { type: 'boolean', rcon: false },
    'broadcast-console-to-ops': { type: 'boolean', rcon: false },
    'broadcast-rcon-to-ops': { type: 'boolean', rcon: false },
    'difficulty-locked': { type: 'boolean', rcon: false },
    'enable-command-block': { type: 'boolean', rcon: false },
    'enable-jmx-monitoring': { type: 'boolean', rcon: false },
    'enable-query': { type: 'boolean', rcon: false },
    'enable-rcon': { type: 'boolean', rcon: false },
    'enable-status': { type: 'boolean', rcon: false },
    'enforce-secure-profile': { type: 'boolean', rcon: false },
    'enforce-whitelist': { type: 'boolean', rcon: true },
    'force-gamemode': { type: 'boolean', rcon: false },
    'generate-structures': { type: 'boolean', rcon: false },
    'hardcore': { type: 'boolean', rcon: false },
    'hide-online-players': { type: 'boolean', rcon: false },
    'log-ips': { type: 'boolean', rcon: false },
    'online-mode': { type: 'boolean', rcon: false },
    'prevent-proxy-connections': { type: 'boolean', rcon: false },
    'pvp': { type: 'boolean', rcon: false },
    'require-resource-pack': { type: 'boolean', rcon: false },
    'spawn-monsters': { type: 'boolean', rcon: false },
    'sync-chunk-writes': { type: 'boolean', rcon: false },
    'use-native-transport': { type: 'boolean', rcon: false },
    'white-list': { type: 'boolean', rcon: true },
    
    // Numeric properties
    'entity-broadcast-range-percentage': { type: 'number', rcon: false },
    'function-permission-level': { type: 'number', rcon: false },
    'max-chained-neighbor-updates': { type: 'number', rcon: false },
    'max-players': { type: 'number', rcon: true },
    'max-tick-time': { type: 'number', rcon: false },
    'max-world-size': { type: 'number', rcon: false },
    'network-compression-threshold': { type: 'number', rcon: false },
    'op-permission-level': { type: 'number', rcon: false },
    'pause-when-empty-seconds': { type: 'number', rcon: false },
    'player-idle-timeout': { type: 'number', rcon: false },
    'query.port': { type: 'number', rcon: false },
    'rate-limit': { type: 'number', rcon: false },
    'rcon.port': { type: 'number', rcon: false },
    'server-port': { type: 'number', rcon: false },
    'simulation-distance': { type: 'number', rcon: false },
    'spawn-protection': { type: 'number', rcon: false },
    'view-distance': { type: 'number', rcon: false },
    
    // String properties
    'bug-report-link': { type: 'string', rcon: false },
    'generator-settings': { type: 'string', rcon: false },
    'initial-disabled-packs': { type: 'string', rcon: false },
    'initial-enabled-packs': { type: 'string', rcon: false },
    'level-name': { type: 'string', rcon: false },
    'level-seed': { type: 'string', rcon: false },
    'motd': { type: 'string', rcon: true },
    'resource-pack': { type: 'string', rcon: false },
    'resource-pack-id': { type: 'string', rcon: false },
    'resource-pack-prompt': { type: 'string', rcon: false },
    'resource-pack-sha1': { type: 'string', rcon: false },
    'rcon.password': { type: 'string', rcon: false },
    'server-ip': { type: 'string', rcon: false },
    'text-filtering-config': { type: 'string', rcon: false },
    'text-filtering-version': { type: 'string', rcon: false },
    
    // Enum properties
    'difficulty': { type: 'enum', values: ['peaceful', 'easy', 'normal', 'hard'], rcon: true },
    'gamemode': { type: 'enum', values: ['survival', 'creative', 'adventure', 'spectator'], rcon: true },
    'level-type': { type: 'enum', values: ['minecraft\\:normal', 'minecraft\\:flat', 'minecraft\\:large_biomes', 'minecraft\\:amplified', 'minecraft\\:single_biome_surface'], rcon: false },
    'region-file-compression': { type: 'enum', values: ['deflate', 'gz', 'none'], rcon: false }
  };

  constructor(
    private readonly dockerService: DockerService,
    private readonly prisma: PrismaService
  ) {}

  private getServerPropertiesPath(serverId: string): string {
    return path.join(this.dockerService.getServerDataPath(serverId), 'server.properties');
  }

  private parseValue(type: string, value: string): any {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        return parseInt(value, 10) || parseFloat(value);
      case 'string':
        return value;
      case 'enum':
        return value;
      default:
        return value;
    }
  }

  private formatValue(type: string, value: any): string {
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
      case 'string':
      case 'enum':
        return String(value);
      default:
        return String(value);
    }
  }

  async getServerProperties(serverId: string): Promise<{ properties: Record<string, any>, isRunning: boolean }> {
    const propertiesPath = this.getServerPropertiesPath(serverId);
    
    // Check if server exists
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }
    
    // Check if container is running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) {
      // Container not found or not running
    }
    
    // Read properties file
    if (!fs.existsSync(propertiesPath)) {
      this.logger.warn(`server.properties not found for server ${serverId}`);
      return { properties: {}, isRunning };
    }
    
    try {
      const content = await fs.promises.readFile(propertiesPath, 'utf-8');
      const properties: Record<string, any> = {};
      
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, value] = trimmedLine.split('=').map(part => part.trim());
          if (key && value !== undefined) {
            const propertyDef = this.PROPERTY_SCHEMA[key];
            if (propertyDef) {
              properties[key] = this.parseValue(propertyDef.type, value);
            } else {
              // Unknown property, store as string
              properties[key] = value;
            }
          }
        }
      }
      
      return { properties, isRunning };
    } catch (error) {
      this.logger.error(`Error reading server.properties for ${serverId}: ${error.message}`);
      throw new BadRequestException('Failed to read server properties');
    }
  }

  async updateServerProperties(
    serverId: string,
    properties: Record<string, any>,
    userId: string
  ): Promise<{ success: boolean; message: string; requiresRestart: boolean }> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }
    
    // Check ownership
    if (server.owner_id !== userId && userId !== 'SUPERADMIN') {
      throw new BadRequestException('Forbidden: You do not own this server');
    }
    
    const propertiesPath = this.getServerPropertiesPath(serverId);
    
    // Read current properties
    let currentProperties: Record<string, string> = {};
    if (fs.existsSync(propertiesPath)) {
      const content = await fs.promises.readFile(propertiesPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, value] = trimmedLine.split('=').map(part => part.trim());
          if (key && value !== undefined) {
            currentProperties[key] = value;
          }
        }
      }
    }
    
    // Update properties
    let requiresRestart = false;
    const rconCommands: string[] = [];
    
    for (const [key, value] of Object.entries(properties)) {
      const propertyDef = this.PROPERTY_SCHEMA[key];
      if (!propertyDef) {
        this.logger.warn(`Unknown property ${key}, skipping`);
        continue;
      }
      
      // Validate enum values
      if (propertyDef.type === 'enum' && propertyDef.values && !propertyDef.values.includes(value)) {
        throw new BadRequestException(`Invalid value for ${key}: ${value}`);
      }
      
      // Format the value
      const formattedValue = this.formatValue(propertyDef.type, value);
      currentProperties[key] = formattedValue;
      
      // Check if this property requires RCON and server is running
      if (propertyDef.rcon) {
        // Properties that can be changed via RCON
        switch (key) {
          case 'white-list':
            rconCommands.push(value ? 'whitelist on' : 'whitelist off');
            break;
          case 'difficulty':
            rconCommands.push(`difficulty ${value}`);
            break;
          case 'gamemode':
            rconCommands.push(`defaultgamemode ${value}`);
            break;
          case 'max-players':
            rconCommands.push(`setmaxplayers ${value}`);
            break;
          case 'motd':
            // MOTD can't be changed via RCON, requires restart
            requiresRestart = true;
            break;
        }
      } else {
        // Properties that require restart
        requiresRestart = true;
      }
    }
    
    // Write updated properties to file
    const newContent = Object.entries(currentProperties)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.promises.writeFile(propertiesPath, newContent, 'utf-8');
    this.logger.log(`Updated server.properties for server ${serverId}`);
    
    // Execute RCON commands if server is running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) {
      // Container not found or not running
    }
    
    if (isRunning && rconCommands.length > 0) {
      for (const command of rconCommands) {
        try {
          await this.dockerService.executeRconCommand(serverId, command);
          this.logger.log(`Executed RCON command: ${command} for server ${serverId}`);
        } catch (error) {
          this.logger.error(`Failed to execute RCON command ${command}: ${error.message}`);
        }
      }
    }
    
    return {
      success: true,
      message: requiresRestart 
        ? 'Properties updated. Some changes require server restart to take effect.'
        : 'Properties updated successfully.',
      requiresRestart
    };
  }
}