import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  UseInterceptors, 
  UploadedFiles, 
  Res, 
  UseGuards, 
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Request,
  Query
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { FilesService } from './files.service';
import type { Response } from 'express';
import 'multer';
import { PrismaService } from './prisma.service';
import { UserRole, CollaboratorRole } from '@prisma/client';

@Controller('files')
@UseGuards(AuthGuard('jwt'))
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * RBAC Access Check for File Operations:
   * - SUPERADMIN & Server Owner: full access
   * - Collaborator with role MANAGER & plan.can_edit_shared_servers: full access
   * - Collaborator with role OPERATOR: 403 Forbidden
   * - Unauthorized users: 403 Forbidden
   */
  private async checkFileAccess(serverId: string, userId: string, role: string): Promise<void> {
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
      throw new ForbiddenException('Accesso negato: il ruolo OPERATOR non può gestire i file del server');
    }

    if (collaborator.user?.plan && !collaborator.user.plan.can_edit_shared_servers) {
      throw new ForbiddenException('Accesso negato: il tuo piano di abbonamento non consente la gestione di server condivisi');
    }
  }

  @Post('mods/upload-bulk/:serverId')
  @UseInterceptors(FilesInterceptor('files'))
  @UseGuards(AuthGuard('jwt'))
  async uploadBulk(
    @Param('serverId') serverId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ) {
    const { userId, role } = req.user;
    await this.checkFileAccess(serverId, userId, role);

    if (!files || files.length === 0) {
      throw new BadRequestException('Nessun file caricato');
    }

    // Path Traversal check on uploaded filenames
    for (const file of files) {
      const originalName = file.originalname || '';
      if (
        originalName.includes('..') ||
        originalName.includes('/') ||
        originalName.includes('\\') ||
        originalName.includes('\0')
      ) {
        throw new BadRequestException(`Caratteri di percorso malevoli rilevati nel nome file: ${originalName}`);
      }
    }

    return this.filesService.uploadBulk(serverId, files);
  }

  @Get('mods/export/:serverId')
  @UseGuards(AuthGuard('jwt'))
  async exportMods(
    @Param('serverId') serverId: string,
    @Res() res: Response,
    @Request() req
  ) {
    const { userId, role } = req.user;
    await this.checkFileAccess(serverId, userId, role);

    return this.filesService.exportMods(serverId, res);
  }

  @Get('world/export/:serverId')
  @UseGuards(AuthGuard('jwt'))
  async exportWorld(
    @Param('serverId') serverId: string,
    @Res() res: Response,
    @Request() req
  ) {
    const { userId, role } = req.user;
    await this.checkFileAccess(serverId, userId, role);

    return this.filesService.exportWorld(serverId, res);
  }

  @Get('list/:serverId')
  @UseGuards(AuthGuard('jwt'))
  async listFiles(
    @Param('serverId') serverId: string,
    @Query('path') queryPath?: string,
    @Request() req?: any
  ) {
    const { userId, role } = req.user;
    await this.checkFileAccess(serverId, userId, role);

    const safeRelativePath = queryPath || '';
    if (
      safeRelativePath.includes('..') ||
      safeRelativePath.includes('\0') ||
      safeRelativePath.includes(':')
    ) {
      throw new BadRequestException('Path non valido: Directory Traversal rilevato');
    }

    return this.filesService.listFiles(serverId, safeRelativePath);
  }
}

