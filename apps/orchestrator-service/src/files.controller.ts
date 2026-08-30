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
  Request,
  Query
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { FilesService } from './files.service';
import type { Response } from 'express';
import 'multer';
import { PrismaService } from './prisma.service';
import { UserRole } from '@prisma/client';

@Controller('files')
@UseGuards(AuthGuard('jwt'))
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('mods/upload-bulk/:serverId')
  @UseInterceptors(FilesInterceptor('files'))
  @UseGuards(AuthGuard('jwt'))
  async uploadBulk(
    @Param('serverId') serverId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ) {
    const { userId, role } = req.user;
    
    // Check ownership
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new BadRequestException('Server not found');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new BadRequestException('Forbidden: You do not own this server');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
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
    
    // Check ownership
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new BadRequestException('Server not found');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new BadRequestException('Forbidden: You do not own this server');
    }

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
    
    // Check ownership
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new BadRequestException('Server not found');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new BadRequestException('Forbidden: You do not own this server');
    }

    return this.filesService.exportWorld(serverId, res);
  }

  @Get('list/:serverId')
  @UseGuards(AuthGuard('jwt'))
  async listFiles(
    @Param('serverId') serverId: string,
    @Query('path') path?: string,
    @Request() req?: any
  ) {
    const { userId, role } = req.user;
    
    // Check ownership
    const server = await this.prisma.mcServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new BadRequestException('Server not found');
    }

    if (role !== UserRole.SUPERADMIN && server.owner_id !== userId) {
      throw new BadRequestException('Forbidden: You do not own this server');
    }

    return this.filesService.listFiles(serverId, path || '');
  }
}
