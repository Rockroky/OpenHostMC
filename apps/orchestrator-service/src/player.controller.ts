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
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlayerService, WhitelistEntry } from './player.service';
import { PrismaService } from './prisma.service';
import { UserRole, CollaboratorRole } from '@prisma/client';

@Controller('players')
@UseGuards(AuthGuard('jwt'))
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * RBAC Access Check for Player Operations:
   * - SUPERADMIN & Server Owner: full access
   * - Collaborator with role MANAGER & plan.can_edit_shared_servers: full access
   * - Collaborator with role OPERATOR: 403 Forbidden
   * - Unauthorized users: 403 Forbidden
   */
  private async checkPlayerAccess(serverId: string, userId: string, role: string): Promise<void> {
    if (!serverId || !/^[a-zA-Z0-9_-]+$/.test(serverId)) {
      throw new BadRequestException('ID server non valido');
    }

    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server non trovato');
    }

    if (role === UserRole.SUPERADMIN || server.owner_id === userId) {
      return;
    }

    const collaborator = await this.prisma.serverCollaborator.findUnique({
      where: { user_id_server_id: { user_id: userId, server_id: serverId } },
      include: { user: { include: { plan: true } } },
    });

    if (!collaborator) {
      throw new ForbiddenException('Accesso negato: non sei autorizzato per questo server');
    }

    if (collaborator.role !== CollaboratorRole.MANAGER) {
      throw new ForbiddenException('Accesso negato: il ruolo OPERATOR non ha i permessi per gestire i giocatori o la configurazione');
    }

    if (collaborator.user?.plan && !collaborator.user.plan.can_edit_shared_servers) {
      throw new ForbiddenException('Accesso negato: il tuo piano di abbonamento non consente la gestione di server condivisi');
    }
  }

  @Get(':serverId/whitelist')
  async getWhitelist(@Param('serverId') serverId: string, @Request() req): Promise<WhitelistEntry[]> {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    return this.playerService.getWhitelist(serverId);
  }

  @Patch(':serverId/whitelist/toggle')
  async toggleWhitelist(
    @Param('serverId') serverId: string,
    @Body() body: { enabled: boolean },
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    if (typeof body.enabled !== 'boolean') throw new BadRequestException('Stato enabled mancante');
    return this.playerService.toggleWhitelist(serverId, body.enabled, req.user.userId);
  }

  @Post(':serverId/whitelist')
  async addToWhitelist(
    @Param('serverId') serverId: string, 
    @Body() body: { playerName: string },
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    if (!body.playerName) throw new BadRequestException('Nome player obbligatorio');
    return this.playerService.addToWhitelist(serverId, body.playerName, req.user.userId);
  }

  @Delete(':serverId/whitelist/:playerName')
  async removeFromWhitelist(
    @Param('serverId') serverId: string,
    @Param('playerName') playerName: string,
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    return this.playerService.removeFromWhitelist(serverId, playerName, req.user.userId);
  }

  // Operator / Permissions management
  @Post(':serverId/op')
  async opPlayer(
    @Param('serverId') serverId: string,
    @Body() body: { playerName: string },
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    if (!body.playerName) throw new BadRequestException('Nome player obbligatorio');
    return this.playerService.opPlayer(serverId, body.playerName, req.user.userId);
  }

  @Post(':serverId/deop')
  async deopPlayer(
    @Param('serverId') serverId: string,
    @Body() body: { playerName: string },
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    if (!body.playerName) throw new BadRequestException('Nome player obbligatorio');
    return this.playerService.deopPlayer(serverId, body.playerName, req.user.userId);
  }

  // Kick management
  @Post(':serverId/kick')
  async kickPlayer(
    @Param('serverId') serverId: string,
    @Body() body: { playerName: string; reason?: string },
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    if (!body.playerName) throw new BadRequestException('Nome player obbligatorio');
    return this.playerService.kickPlayer(serverId, body.playerName, body.reason, req.user.userId);
  }

  // Usercache endpoints
  @Get(':serverId/usercache')
  async getUsercache(@Param('serverId') serverId: string, @Request() req) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    return this.playerService.getUsercache(serverId);
  }

  // Bans endpoints
  @Get(':serverId/bans')
  async getBans(@Param('serverId') serverId: string, @Request() req) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
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
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
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
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    return this.playerService.pardonPlayer(serverId, username, req.user.userId);
  }

  @Post(':serverId/bans/ip')
  async banIp(
    @Param('serverId') serverId: string,
    @Body() body: { ip: string, reason?: string, expires?: string },
    @Request() req
  ) {
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
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
    await this.checkPlayerAccess(serverId, req.user.userId, req.user.role);
    return this.playerService.pardonIp(serverId, ip, req.user.userId);
  }
}

