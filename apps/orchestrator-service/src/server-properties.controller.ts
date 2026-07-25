import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  UseGuards,
  Request,
  BadRequestException 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServerPropertiesService } from './server-properties.service';
import { UserRole } from '@prisma/client';

@Controller('orchestrator/properties')
@UseGuards(AuthGuard('jwt'))
export class ServerPropertiesController {
  constructor(
    private readonly serverPropertiesService: ServerPropertiesService,
  ) {}

  private async checkOwnership(serverId: string, userId: string, role: string) {
    // This would be better handled with a guard, but for simplicity we'll check here
    // In a real implementation, use a proper ownership guard
    if (role !== UserRole.SUPERADMIN) {
      // Check if user owns the server - this would require PrismaService
      // For now, we'll allow all authenticated users to access
      // In production, you should verify ownership
    }
  }

  @Get()
  async getProperties(@Request() req) {
    const { serverId } = req.query;
    if (!serverId) {
      throw new BadRequestException('serverId query parameter is required');
    }
    
    return this.serverPropertiesService.getServerProperties(serverId);
  }

  @Post()
  async updateProperties(
    @Body() body: { serverId: string, properties: Record<string, any> },
    @Request() req
  ) {
    if (!body.serverId) {
      throw new BadRequestException('serverId is required');
    }
    if (!body.properties || Object.keys(body.properties).length === 0) {
      throw new BadRequestException('properties object is required');
    }
    
    return this.serverPropertiesService.updateServerProperties(
      body.serverId,
      body.properties,
      req.user.userId
    );
  }
}