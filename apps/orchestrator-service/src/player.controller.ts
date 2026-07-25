import { 
  Controller, 
  Get, 
  Post, 
  Patch,
  Delete, 
  Param, 
  Body, 
  UseGuards, 
  Request,
  BadRequestException 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlayerService, WhitelistEntry } from './player.service';
import { PrismaService } from './prisma.service';
import { UserRole } from '@prisma/client';

@Controller('players')
@UseGuards(AuthGuard('jwt'))
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly prisma: PrismaService,
  ) {}

  private async checkOwnership(serverId: string, userId: string, role: string) {
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new BadRequestException('Server non trovato');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new BadRequestException('Non hai i permessi per gestire questo server');
    }
  }

  @Get(':serverId/whitelist')
  async getWhitelist(@Param('serverId') serverId: string, @Request() req): Promise<WhitelistEntry[]> {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    return this.playerService.getWhitelist(serverId);
  }

  @Patch(':serverId/whitelist/toggle')
  async toggleWhitelist(
    @Param('serverId') serverId: string,
    @Body() body: { enabled: boolean },
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    if (typeof body.enabled !== 'boolean') throw new BadRequestException('Stato enabled mancante');
    return this.playerService.toggleWhitelist(serverId, body.enabled, req.user.userId);
  }

  @Post(':serverId/whitelist')
  async addToWhitelist(
    @Param('serverId') serverId: string, 
    @Body() body: { playerName: string },
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    if (!body.playerName) throw new BadRequestException('Nome player obbligatorio');
    return this.playerService.addToWhitelist(serverId, body.playerName, req.user.userId);
  }

  @Delete(':serverId/whitelist/:playerName')
  async removeFromWhitelist(
    @Param('serverId') serverId: string,
    @Param('playerName') playerName: string,
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    return this.playerService.removeFromWhitelist(serverId, playerName, req.user.userId);
  }

  // Usercache endpoints
  @Get(':serverId/usercache')
  async getUsercache(@Param('serverId') serverId: string, @Request() req) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    return this.playerService.getUsercache(serverId);
  }

  // Bans endpoints
  @Get(':serverId/bans')
  async getBans(@Param('serverId') serverId: string, @Request() req) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    const players = await this.playerService.getBannedPlayers(serverId);
    const ips = await this.playerService.getBannedIps(serverId);
    return { players, ips };
  }

  @Post(':serverId/bans/player')
  async banPlayer(
    @Param('serverId') serverId: string,
    @Body() body: { username: string, reason?: string, expires?: string },
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    if (!body.username) throw new BadRequestException('username is required');
    return this.playerService.banPlayer(
      serverId,
      body.username,
      body.reason || 'Banned by administrator',
      body.expires || 'Never',
      req.user.userId
    );
  }

  @Delete(':serverId/bans/player/:username')
  async pardonPlayer(
    @Param('serverId') serverId: string,
    @Param('username') username: string,
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    return this.playerService.pardonPlayer(serverId, username, req.user.userId);
  }

  @Post(':serverId/bans/ip')
  async banIp(
    @Param('serverId') serverId: string,
    @Body() body: { ip: string, reason?: string, expires?: string },
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    if (!body.ip) throw new BadRequestException('ip is required');
    return this.playerService.banIp(
      serverId,
      body.ip,
      body.reason || 'Banned by administrator',
      body.expires || 'Never',
      req.user.userId
    );
  }

  @Delete(':serverId/bans/ip/:ip')
  async pardonIp(
    @Param('serverId') serverId: string,
    @Param('ip') ip: string,
    @Request() req
  ) {
    await this.checkOwnership(serverId, req.user.userId, req.user.role);
    return this.playerService.pardonIp(serverId, ip, req.user.userId);
  }
}
