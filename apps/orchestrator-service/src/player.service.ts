import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';
import { DockerService } from './docker.service';
import { PrismaService } from './prisma.service';

export interface WhitelistEntry {
  uuid: string;
  name: string;
}

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly dockerService: DockerService,
    private readonly prisma: PrismaService
  ) {}

  private getWhitelistPath(serverId: string) {
    return path.join(this.dockerService.getServerDataPath(serverId), 'whitelist.json');
  }

  private getPropertiesPath(serverId: string) {
    return path.join(this.dockerService.getServerDataPath(serverId), 'server.properties');
  }

  private getOfflineUUID(username: string): string {
    const data = Buffer.from(`OfflinePlayer:${username}`, 'utf8');
    const md5 = crypto.createHash('md5').update(data).digest();
    
    // Set version to 3 (MD5 based)
    md5[6] = (md5[6] & 0x0f) | 0x30;
    // Set variant to RFC 4122
    md5[8] = (md5[8] & 0x3f) | 0x80;
    
    const hex = md5.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  async getWhitelist(serverId: string): Promise<WhitelistEntry[]> {
    const filePath = this.getWhitelistPath(serverId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Errore lettura whitelist per ${serverId}: ${error.message}`);
      return [];
    }
  }

  async toggleWhitelist(serverId: string, enabled: boolean, userId: string): Promise<{ success: boolean; message: string }> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    // Update server.properties file (white-list=...)
    const propertiesPath = path.join(this.dockerService.getServerDataPath(serverId), 'server.properties');
    let propertiesContent: string;
    try {
      propertiesContent = await fs.promises.readFile(propertiesPath, 'utf-8');
    } catch {
      propertiesContent = '';
    }
    const lines = propertiesContent.split('\n');
    let found = false;
    const newLines = lines.map(line => {
      if (line.startsWith('white-list=')) {
        found = true;
        return `white-list=${enabled}`;
      }
      return line;
    });
    if (!found) {
      newLines.push(`white-list=${enabled}`);
    }
    await fs.promises.writeFile(propertiesPath, newLines.join('\n'), 'utf-8');
    this.logger.log(`✅ Updated server.properties: white-list=${enabled} for server ${serverId}`);

    // Update whitelist.json content (if disabling, we keep the file but server won't use it)
    // The file is left unchanged – Minecraft will ignore it if white-list=false

    // Send RCON command only if container is running
    const containerName = this.dockerService.getContainerName(serverId);
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) { /* container not exist */ }

    if (isRunning) {
      const rconCommand = enabled ? 'whitelist on' : 'whitelist off';
      await this.dockerService.executeRconCommand(serverId, rconCommand);
      this.logger.log(`✅ RCON command executed: ${rconCommand} for server ${serverId}`);
    } else {
      this.logger.log(`Server ${serverId} is not running, whitelist toggle saved to disk only`);
    }

    return { success: true, message: `Whitelist ${enabled ? 'enabled' : 'disabled'} successfully` };
  }

  async addToWhitelist(serverId: string, playerName: string, userId: string): Promise<any> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    const normalizedName = playerName.toLowerCase();

    // Read online-mode from server.properties
    const propertiesPath = path.join(this.dockerService.getServerDataPath(serverId), 'server.properties');
    let onlineMode = true;
    try {
      const content = await fs.promises.readFile(propertiesPath, 'utf-8');
      const match = content.match(/^online-mode=(.*)$/m);
      if (match) onlineMode = match[1].trim() === 'true';
    } catch { /* file may not exist yet */ }

    // Calculate the correct UUID (same algorithm Minecraft uses)
    const uuid = onlineMode
      ? await this.fetchPremiumUUID(playerName)
      : this.getOfflineUUID(normalizedName);

    // Write to whitelist.json directly and reload via RCON
    const whitelistPath = path.join(this.dockerService.getServerDataPath(serverId), 'whitelist.json');
    let whitelist: any[] = [];
    try {
      const data = await fs.promises.readFile(whitelistPath, 'utf-8');
      whitelist = JSON.parse(data);
    } catch { /* file does not exist */ }

    // Check if already in whitelist (case-insensitive)
    if (whitelist.some(e => e.name.toLowerCase() === normalizedName)) {
      throw new BadRequestException(`Player ${playerName} is already in the whitelist`);
    }

    // Remove old entries with same name (different case) and add the new one
    whitelist = whitelist.filter(e => e.name.toLowerCase() !== normalizedName);
    whitelist.push({ uuid, name: normalizedName });
    await fs.promises.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2), 'utf-8');
    this.logger.log(`✅ Written whitelist.json for ${normalizedName} (UUID: ${uuid}) on server ${serverId}`);

    // Send whitelist reload via RCON if server is running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch { /* container not found */ }

    if (isRunning) {
      await this.dockerService.executeRconCommand(serverId, 'whitelist reload');
      this.logger.log(`✅ RCON whitelist reload for server ${serverId}`);
    }

    return { success: true, uuid, playerName: normalizedName };
  }

  private async fetchPremiumUUID(playerName: string): Promise<string> {
    try {
      const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
      if (!response.data) throw new BadRequestException('Player not found');
      const id = response.data.id;
      return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
    } catch (error) {
      throw new BadRequestException('Failed to fetch premium UUID');
    }
  }

  async removeFromWhitelist(serverId: string, playerName: string, userId: string) {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    const normalizedName = playerName.toLowerCase();

    // Update whitelist.json directly
    let whitelist = await this.getWhitelist(serverId);
    whitelist = whitelist.filter(p => p.name.toLowerCase() !== normalizedName);
    fs.writeFileSync(this.getWhitelistPath(serverId), JSON.stringify(whitelist, null, 2));
    this.logger.log(`✅ Removed ${normalizedName} from whitelist.json for server ${serverId}`);

    // Reload via RCON if server is running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch { /* container not found */ }

    if (isRunning) {
      await this.dockerService.executeRconCommand(serverId, 'whitelist reload');
      this.logger.log(`✅ RCON whitelist reload after remove for server ${serverId}`);
    }

    return { success: true };
  }

  // Usercache management (read-only)
  async getUsercache(serverId: string): Promise<Array<{ name: string, uuid: string }>> {
    const usercachePath = path.join(this.dockerService.getServerDataPath(serverId), 'usercache.json');
    if (!fs.existsSync(usercachePath)) {
      return [];
    }
    
    try {
      const content = await fs.promises.readFile(usercachePath, 'utf-8');
      const usercache = JSON.parse(content);
      return usercache.map(entry => ({
        name: entry.name,
        uuid: entry.uuid
      }));
    } catch (error) {
      this.logger.error(`Error reading usercache for ${serverId}: ${error.message}`);
      return [];
    }
  }

  // Banned players management
  async getBannedPlayers(serverId: string): Promise<Array<{ name: string, uuid: string, created: string, source: string, expires: string, reason: string }>> {
    const bannedPlayersPath = path.join(this.dockerService.getServerDataPath(serverId), 'banned-players.json');
    if (!fs.existsSync(bannedPlayersPath)) {
      return [];
    }
    
    try {
      const content = await fs.promises.readFile(bannedPlayersPath, 'utf-8');
      const bannedPlayers = JSON.parse(content);
      return bannedPlayers.map(entry => ({
        name: entry.name,
        uuid: entry.uuid,
        created: entry.created || new Date().toISOString(),
        source: entry.source || 'Unknown',
        expires: entry.expires || 'Never',
        reason: entry.reason || 'No reason specified'
      }));
    } catch (error) {
      this.logger.error(`Error reading banned-players for ${serverId}: ${error.message}`);
      return [];
    }
  }

  async banPlayer(
    serverId: string,
    username: string,
    reason: string = 'Banned by administrator',
    expires: string = 'Never',
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    // Resolve UUID based on server's online-mode
    const propertiesPath = path.join(this.dockerService.getServerDataPath(serverId), 'server.properties');
    const content = await fs.promises.readFile(propertiesPath, 'utf-8');
    const onlineModeMatch = content.match(/^online-mode=(.*)$/m);
    const onlineMode = onlineModeMatch ? onlineModeMatch[1].trim() === 'true' : true;

    let uuid: string;
    if (onlineMode) {
      // Premium: fetch UUID from Mojang API
      try {
        const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        if (!response.data) throw new BadRequestException('Player not found');
        const data = response.data;
        uuid = data.id;
        uuid = `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20)}`;
      } catch (error) {
        throw new BadRequestException('Failed to resolve player UUID');
      }
    } else {
      // Offline: generate UUID from OfflinePlayer:<name>
      const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex');
      uuid = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
    }

    // Read current banned-players.json
    const bannedPlayersPath = path.join(this.dockerService.getServerDataPath(serverId), 'banned-players.json');
    let bannedPlayers: any[] = [];
    let bannedPlayersExists = false;
    try {
      await fs.promises.access(bannedPlayersPath);
      bannedPlayersExists = true;
    } catch { /* file does not exist */ }
    if (bannedPlayersExists) {
      const data = await fs.promises.readFile(bannedPlayersPath, 'utf-8');
      bannedPlayers = JSON.parse(data);
    }

    // Check if already banned
    if (bannedPlayers.some(entry => entry.name === username)) {
      throw new BadRequestException('Player already banned');
    }

    // Add ban entry
    bannedPlayers.push({
      name: username,
      uuid: uuid,
      created: new Date().toISOString(),
      source: 'OpenHostMC',
      expires: expires,
      reason: reason
    });

    await fs.promises.writeFile(bannedPlayersPath, JSON.stringify(bannedPlayers, null, 2), 'utf-8');

    // RCON command if server running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) {}

    if (isRunning) {
      await this.dockerService.executeRconCommand(serverId, `ban ${username} ${reason}`);
    }

    return { success: true, message: `Player ${username} banned successfully` };
  }

  async pardonPlayer(serverId: string, username: string, userId: string): Promise<{ success: boolean; message: string }> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    // Remove from banned-players.json
    const bannedPlayersPath = path.join(this.dockerService.getServerDataPath(serverId), 'banned-players.json');
    let bannedPlayers: any[] = [];
    try {
      const data = await fs.promises.readFile(bannedPlayersPath, 'utf-8');
      bannedPlayers = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or can't be read
    }

    bannedPlayers = bannedPlayers.filter(p => p.name.toLowerCase() !== username.toLowerCase());
    await fs.promises.writeFile(bannedPlayersPath, JSON.stringify(bannedPlayers, null, 2), 'utf-8');

    // RCON command if server running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) {}

    if (isRunning) {
      await this.dockerService.executeRconCommand(serverId, `pardon ${username}`);
    }

    return { success: true, message: `Player ${username} pardoned successfully` };
  }

  // Banned IPs management
  async getBannedIps(serverId: string): Promise<Array<{ ip: string, created: string, source: string, expires: string, reason: string }>> {
    const bannedIpsPath = path.join(this.dockerService.getServerDataPath(serverId), 'banned-ips.json');
    if (!fs.existsSync(bannedIpsPath)) {
      return [];
    }
    
    try {
      const content = await fs.promises.readFile(bannedIpsPath, 'utf-8');
      const bannedIps = JSON.parse(content);
      return bannedIps.map(entry => ({
        ip: entry.ip,
        created: entry.created || new Date().toISOString(),
        source: entry.source || 'Unknown',
        expires: entry.expires || 'Never',
        reason: entry.reason || 'No reason specified'
      }));
    } catch (error) {
      this.logger.error(`Error reading banned-ips for ${serverId}: ${error.message}`);
      return [];
    }
  }

  async banIp(
    serverId: string,
    ip: string,
    reason: string = 'Banned by administrator',
    expires: string = 'Never',
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    // Read current banned-ips.json
    const bannedIpsPath = path.join(this.dockerService.getServerDataPath(serverId), 'banned-ips.json');
    let bannedIps: any[] = [];
    let bannedIpsExists = false;
    try {
      await fs.promises.access(bannedIpsPath);
      bannedIpsExists = true;
    } catch { /* file does not exist */ }
    if (bannedIpsExists) {
      const data = await fs.promises.readFile(bannedIpsPath, 'utf-8');
      bannedIps = JSON.parse(data);
    }

    // Check if already banned
    if (bannedIps.some(entry => entry.ip === ip)) {
      throw new BadRequestException('IP already banned');
    }

    // Add ban entry
    bannedIps.push({
      ip: ip,
      created: new Date().toISOString(),
      source: 'OpenHostMC',
      expires: expires,
      reason: reason
    });

    await fs.promises.writeFile(bannedIpsPath, JSON.stringify(bannedIps, null, 2), 'utf-8');

    // RCON command if server running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) {}

    if (isRunning) {
      await this.dockerService.executeRconCommand(serverId, `ban-ip ${ip}`);
    }

    return { success: true, message: `IP ${ip} banned successfully` };
  }

  async pardonIp(serverId: string, ip: string, userId: string): Promise<{ success: boolean; message: string }> {
    const server = await this.prisma.mcServer.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.owner_id !== userId && userId !== 'SUPERADMIN')
      throw new UnauthorizedException();

    // Remove from banned-ips.json
    const bannedIpsPath = path.join(this.dockerService.getServerDataPath(serverId), 'banned-ips.json');
    let bannedIps: any[] = [];
    try {
      const data = await fs.promises.readFile(bannedIpsPath, 'utf-8');
      bannedIps = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or can't be read
    }

    bannedIps = bannedIps.filter(entry => entry.ip !== ip);
    await fs.promises.writeFile(bannedIpsPath, JSON.stringify(bannedIps, null, 2), 'utf-8');

    // RCON command if server running
    let isRunning = false;
    try {
      const container = this.dockerService.getContainer(serverId);
      const inspect = await container.inspect();
      isRunning = inspect.State.Running;
    } catch (e) {}

    if (isRunning) {
      await this.dockerService.executeRconCommand(serverId, `pardon-ip ${ip}`);
    }

    return { success: true, message: `IP ${ip} pardoned successfully` };
  }
}
