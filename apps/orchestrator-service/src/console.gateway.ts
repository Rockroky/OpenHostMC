import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DockerService } from './docker.service';
import Docker from 'dockerode';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from './prisma.service';
import { UserRole } from '@prisma/client';

@WebSocketGateway(3005, {
  cors: { origin: '*' },
  namespace: 'console',
})
export class ConsoleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConsoleGateway.name);
  private docker: Docker;

  constructor(
    private readonly dockerService: DockerService,
    private readonly prisma: PrismaService,
  ) {
    this.docker = new Docker();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.data.logStream) {
      client.data.logStream.destroy();
    }
    if (client.data.statsStream) {
      client.data.statsStream.destroy();
    }
  }

  private authenticate(client: Socket, token?: string): { userId: string; role: string } | null {
    const jwtToken = token || (client.handshake.auth?.token as string);
    if (!jwtToken) return null;
    try {
      const decoded: any = jwt.verify(jwtToken, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      return { userId: decoded.sub, role: decoded.role };
    } catch {
      return null;
    }
  }

  @SubscribeMessage('join-console')
  async handleJoinConsole(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { serverId: string; token?: string },
  ) {
    const user = this.authenticate(client, payload.token);
    if (!user) {
      return client.emit('console-error', 'Unauthorized: invalid or missing token');
    }

    const server = await this.prisma.mcServer.findUnique({ where: { id: payload.serverId } });
    if (!server) {
      return client.emit('console-error', 'Server non trovato');
    }
    if (server.owner_id !== user.userId && user.role !== 'SUPERADMIN') {
      return client.emit('console-error', 'Non autorizzato');
    }

    const containerName = this.dockerService.getContainerName(payload.serverId);
    const container = this.docker.getContainer(containerName);

    client.data.serverId = payload.serverId;

    try {
      const logStream = await container.logs({ follow: true, stdout: true, stderr: true, tail: 100 });
      logStream.on('data', (chunk: Buffer) => {
        const str = chunk.length > 8 ? chunk.toString('utf8', 8) : chunk.toString('utf8');
        client.emit('console-log', str);
      });
      logStream.on('error', (err: Error) => {
        this.logger.error(`Log stream error for ${payload.serverId}: ${err.message}`);
        client.emit('console-error', 'Log stream error');
      });
      client.data.logStream = logStream;

      const statsStream = await container.stats({ stream: true });
      statsStream.on('data', (chunk: Buffer) => {
        try {
          const stats = JSON.parse(chunk.toString());
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
          const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
          const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;
          const ramMB = stats.memory_stats.usage / (1024 * 1024);
          client.emit('stats', { cpu: Math.round(cpuPercent), ram: Math.round(ramMB) });
        } catch (e) {
          this.logger.error(`Stats parse error for ${payload.serverId}: ${e.message}`);
        }
      });
      statsStream.on('error', (err: Error) => {
        this.logger.error(`Stats stream error for ${payload.serverId}: ${err.message}`);
      });
      client.data.statsStream = statsStream;

      client.join(`server_${payload.serverId}`);
      this.logger.log(`Client ${client.id} joined console for server ${payload.serverId}`);
    } catch (err) {
      this.logger.error(`Failed to start streams for ${payload.serverId}: ${err.message}`);
      client.emit('console-error', 'Container non trovato o non avviato');
    }
  }

  @SubscribeMessage('send-command')
  async handleSendCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serverId: string; command: string; token?: string },
  ) {
    const user = this.authenticate(client, data.token);
    if (!user) {
      return client.emit('console-error', 'Unauthorized');
    }
    const server = await this.prisma.mcServer.findUnique({ where: { id: data.serverId } });
    if (!server || (server.owner_id !== user.userId && user.role !== 'SUPERADMIN')) {
      return client.emit('console-error', 'Forbidden');
    }
    try {
      await this.dockerService.executeRconCommand(data.serverId, data.command);
    } catch (error) {
      client.emit('console-error', `Failed to execute command: ${error.message}`);
    }
  }
}
