import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServerPropertiesService } from './server-properties.service';
import { PrismaService } from './prisma.service';
import { ConsoleGateway } from './console.gateway';
import { UserRole, CollaboratorRole } from '@prisma/client';

@Controller('orchestrator/properties')
@UseGuards(AuthGuard('jwt'))
export class ServerPropertiesController {
  constructor(
    private readonly serverPropertiesService: ServerPropertiesService,
    private readonly prisma: PrismaService,
    private readonly consoleGateway: ConsoleGateway,
  ) {}

  /**
   * RBAC Access Check for Server Properties:
   * - SUPERADMIN & Server Owner: full access
   * - Collaborator with role MANAGER & plan.can_edit_shared_servers: full access
   * - Collaborator with role OPERATOR: 403 Forbidden
   * - Unauthorized users: 403 Forbidden
   */
  private async checkPropertiesAccess(
    serverId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    if (
      !serverId ||
      typeof serverId !== 'string' ||
      !/^[a-zA-Z0-9_-]+$/.test(serverId)
    ) {
      throw new BadRequestException('ID server non valido o mancante');
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
      throw new ForbiddenException(
        'Accesso negato: non sei autorizzato per questo server',
      );
    }

    if (collaborator.role !== CollaboratorRole.MANAGER) {
      throw new ForbiddenException(
        'Accesso negato: il ruolo OPERATOR non può visualizzare o modificare le proprietà del server',
      );
    }

    if (
      collaborator.user?.plan &&
      !collaborator.user.plan.can_edit_shared_servers
    ) {
      throw new ForbiddenException(
        'Accesso negato: il tuo piano di abbonamento non consente la gestione di server condivisi',
      );
    }
  }

  @Get()
  async getProperties(@Request() req) {
    const { serverId } = req.query;
    if (!serverId || typeof serverId !== 'string') {
      throw new BadRequestException('serverId query parameter is required');
    }

    const { userId, role } = req.user;
    await this.checkPropertiesAccess(serverId, userId, role);

    return this.serverPropertiesService.getServerProperties(serverId);
  }

  @Post()
  async updateProperties(
    @Body() body: { serverId: string; properties: Record<string, any> },
    @Request() req,
  ) {
    if (!body.serverId) {
      throw new BadRequestException('serverId is required');
    }
    if (!body.properties || Object.keys(body.properties).length === 0) {
      throw new BadRequestException('properties object is required');
    }

    const { userId, role } = req.user;
    await this.checkPropertiesAccess(body.serverId, userId, role);

    const result = await this.serverPropertiesService.updateServerProperties(
      body.serverId,
      body.properties,
      userId,
    );
    this.consoleGateway.broadcastServerSettings(body.serverId);
    return result;
  }
}
