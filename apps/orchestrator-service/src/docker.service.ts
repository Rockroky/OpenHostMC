import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import * as Dockerode from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PassThrough } from 'stream';
import { v4 as uuidv4 } from 'uuid';

const SERVER_DATA_PATH = process.env.SERVER_DATA_PATH || './servers';

@Injectable()
export class DockerService {
  private docker: Docker;
  private readonly logger = new Logger(DockerService.name);

  // Mappatura completa server.properties -> variabili d'ambiente itzg/minecraft-server
  private readonly ENV_MAPPING: Record<string, string> = {
    'online-mode': 'ONLINE_MODE',
    'max-players': 'MAX_PLAYERS',
    'difficulty': 'DIFFICULTY',
    'motd': 'MOTD',
    'gamemode': 'GAMEMODE',
    'pvp': 'PVP',
    'hardcore': 'HARDCORE',
    'allow-flight': 'ALLOW_FLIGHT',
    'allow-nether': 'ALLOW_NETHER',
    'spawn-monsters': 'SPAWN_MONSTERS',
    'spawn-protection': 'SPAWN_PROTECTION',
    'view-distance': 'VIEW_DISTANCE',
    'simulation-distance': 'SIMULATION_DISTANCE',
    'level-name': 'LEVEL',
    'level-seed': 'SEED',
    'level-type': 'LEVEL_TYPE',
    'enforce-whitelist': 'ENFORCE_WHITELIST',
    'enable-rcon': 'ENABLE_RCON',
    'rcon.password': 'RCON_PASSWORD',
    'rcon.port': 'RCON_PORT',
    'server-port': 'SERVER_PORT',
    'enable-command-block': 'ENABLE_COMMAND_BLOCK',
    'force-gamemode': 'FORCE_GAMEMODE',
    'enable-query': 'ENABLE_QUERY',
    'query.port': 'QUERY_PORT',
    'max-tick-time': 'MAX_TICK_TIME',
    'network-compression-threshold': 'NETWORK_COMPRESSION_THRESHOLD',
    'op-permission-level': 'OP_PERMISSION_LEVEL',
    'player-idle-timeout': 'PLAYER_IDLE_TIMEOUT',
    'entity-broadcast-range-percentage': 'ENTITY_BROADCAST_RANGE_PERCENTAGE',
    'max-world-size': 'MAX_WORLD_SIZE',
    'require-resource-pack': 'REQUIRE_RESOURCE_PACK',
    'resource-pack': 'RESOURCE_PACK',
    'resource-pack-sha1': 'RESOURCE_PACK_SHA1',
    'prevent-proxy-connections': 'PREVENT_PROXY_CONNECTIONS',
    'enable-status': 'ENABLE_STATUS',
    'broadcast-rcon-to-ops': 'BROADCAST_RCON_TO_OPS',
    'sync-chunk-writes': 'SYNC_CHUNK_WRITES',
    'generate-structures': 'GENERATE_STRUCTURES',
    'pause-when-empty-seconds': 'PAUSE_WHEN_EMPTY_SECONDS'
  };

  constructor() {
    this.docker = new Docker();
  }

  async startMinecraftServer(
    serverId: string, 
    port: number, 
    properties: Record<string, string> = {},
    options: { ramMb: number; cpuCores: number; mcType: string; mcVersion: string }
  ): Promise<{ status: string; containerName: string; port: number; rconPassword?: string; rconPort?: number }> {
    const containerName = this.getContainerName(serverId);

    // Configurazione path sull'host per il Bind Mount (Fase 2)
    const internalDataPath = path.join(
      process.cwd(),
      'data',
      'servers',
      serverId
    );
    
    const hostDataPath = process.env.HOST_DATA_PATH 
      ? path.join(process.env.HOST_DATA_PATH, serverId) 
      : internalDataPath;

    try {
      this.logger.log(`Tento di avviare il server ${serverId} sulla porta ${port} con ${options.ramMb}MB RAM e ${options.cpuCores} Cores`);
      
      // Assicurati che la cartella esista localmente nel container di OpenHostMC
      if (!fs.existsSync(internalDataPath)) {
        await fs.promises.mkdir(internalDataPath, { recursive: true });
        this.logger.log(`Cartella creata localmente: ${internalDataPath}`);
      }

      // 1. Pull dell'immagine
      const stream = await this.docker.pull('itzg/minecraft-server:latest');
      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any) => (err ? reject(err) : resolve()));
      });

      // Generate RCON password for this session
      const rconPassword = uuidv4().replace(/-/g, '').substring(0, 16);
      const rconPort = 25575;

      // Mappa le proprietà salvate in variabili d'ambiente per il primo avvio
      const envVars = [
        'EULA=TRUE',
        `TYPE=${options.mcType}`,
        `VERSION=${options.mcVersion}`,
        `MEMORY=${options.ramMb}M`,
        'ENABLE_WHITELIST=FALSE',
        'ENABLE_RCON=TRUE',
        `RCON_PASSWORD=${rconPassword}`,
        `RCON_PORT=${rconPort}`,
      ];

      this.logger.log(`ENABLE_RCON=TRUE, ENABLE_WHITELIST=FALSE for container ${containerName}`);

      for (const [propKey, envKey] of Object.entries(this.ENV_MAPPING)) {
        if (properties[propKey]) {
          envVars.push(`${envKey}=${properties[propKey]}`);
        }
      }

      // 2. Verifica se esiste già un container con lo stesso nome e rimuovilo
      try {
        const existingContainer = this.docker.getContainer(containerName);
        const inspect = await existingContainer.inspect();
        this.logger.log(`Trovato container esistente ${containerName} (Status: ${inspect.State.Status}). Rimozione in corso...`);
        if (inspect.State.Running) {
          await existingContainer.stop();
        }
        await existingContainer.remove();
        this.logger.log(`✅ Container esistente rimosso.`);
      } catch (e: any) {
        if (e.statusCode !== 404) {
          this.logger.warn(`Errore durante la rimozione del container esistente: ${e.message}`);
        }
        // Se 404, il container non esiste, procediamo normalmente
      }

      // 3. Crea il container con Bind Mount e limiti risorse
      const container = await this.docker.createContainer({
        Image: 'itzg/minecraft-server:latest',
        name: containerName,
        Env: envVars,
        HostConfig: {
          Binds: [`${hostDataPath}:/data`],
          PortBindings: {
            '25565/tcp': [{ HostPort: port.toString() }],
          },
          Memory: options.ramMb * 1024 * 1024,
          CpuQuota: options.cpuCores * 100000,
          CpuPeriod: 100000,
        },
      });

      // 4. Avvia il container
      await container.start();
      this.logger.log(`✅ Container ${containerName} avviato con successo con Bind Mount in ${hostDataPath}`);
      
      return { status: 'STARTED', containerName, port, rconPassword, rconPort };

    } catch (error: any) {
      this.logger.error(`Errore durante l'avvio del container: ${error.message}`);
      throw error;
    }
  }

  async stopMinecraftServer(serverId: string) {
    const containerName = this.getContainerName(serverId);
    const container = this.docker.getContainer(containerName);
    try {
      const inspect = await container.inspect();
      if (inspect.State.Running) {
        await container.stop();
      }
      await container.remove();
      return { status: 'STOPPED' };
    } catch (error: any) {
      if (error.statusCode === 404) return { status: 'STOPPED' };
      throw error;
    }
  }

  async getServerStatus(serverId: string): Promise<string> {
    const containerName = this.getContainerName(serverId);
    const container = this.docker.getContainer(containerName);

    try {
      const inspect = await container.inspect();
      return inspect.State.Status;
    } catch (error: any) {
      if (error.statusCode === 404) return 'NOT_FOUND';
      throw error;
    }
  }

  public getContainerName(serverId: string): string {
    return `mc-server-${this.getSanitizedName(serverId)}`;
  }

  public getServerDataPath(serverId: string): string {
    return path.join(SERVER_DATA_PATH, serverId);
  }

  public getContainer(serverId: string): Docker.Container {
    return this.docker.getContainer(this.getContainerName(serverId));
  }

  // --- Fase 1 & 2: Metodi per il salvataggio delle proprietà ---

  async updateServerProperties(serverId: string, properties: Record<string, string>) {
    const containerName = this.getContainerName(serverId);
    const fileContent = this.formatProperties(properties);

    try {
      // 1. Salva sempre su disco prima (Fase 2 - Bind Mount)
      await this.savePropertiesToDisk(serverId, fileContent);

      // 2. Se il container è in esecuzione, prova ad aggiornarlo live (Fase 1)
      const container = this.docker.getContainer(containerName);
      let isRunning = false;
      try {
        const inspect = await container.inspect();
        isRunning = inspect.State.Running;
      } catch (e) {
        // Container non esiste o errore, procediamo come se non fosse in esecuzione
      }

      if (isRunning) {
        try {
          this.logger.log(`Tentativo di scrittura live via exec per ${containerName}`);
          await this.writePropertiesViaExec(containerName, fileContent);
        } catch (execError: any) {
          this.logger.warn(`Exec fallito, provo con fallback cp: ${execError.message}`);
          await this.writePropertiesViaCp(containerName, fileContent);
        }

        // Riavvia il container per applicare le modifiche (Minecraft le legge all'avvio)
        this.logger.log(`Riavvio container ${containerName} per applicare le proprietà...`);
        await container.restart({ t: 5 });
        this.logger.log(`✅ Container ${containerName} riavviato.`);
      }

      return { success: true, writtenToContainer: isRunning };
    } catch (error: any) {
      this.logger.error(`Errore durante l'aggiornamento proprietà: ${error.message}`);
      throw error;
    }
  }

async executeRconCommand(serverId: string, command: string): Promise<void> {
    const containerName = this.getContainerName(serverId);
    try {
      const container = this.docker.getContainer(containerName);
      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        this.logger.warn(`Container ${containerName} not running, skipping RCON command`);
        return;
      }
      // Use the existing RCON client logic (assumed to be implemented elsewhere or here)
      // For simplicity, we exec 'rcon-cli' inside container (requires rcon-cli installed)
      const exec = await container.exec({
        Cmd: ['rcon-cli', command],
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = await exec.start({});
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      this.logger.log(`RCON command executed: ${command}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.warn(`Container ${containerName} not found, skipping RCON`);
        return;
      }
      this.logger.error(`RCON error for ${containerName}: ${error.message}`);
      throw error;
    }
  }

  private async savePropertiesToDisk(serverId: string, fileContent: string) {
    const internalDataPath = path.join(
      process.cwd(),
      'data',
      'servers',
      serverId
    );
    const filePath = path.join(internalDataPath, 'server.properties');

    if (!fs.existsSync(internalDataPath)) {
      await fs.promises.mkdir(internalDataPath, { recursive: true });
    }

    await fs.promises.writeFile(filePath, fileContent, 'utf8');
    this.logger.log(`✅ server.properties scritto su disco: ${filePath}`);
  }

  private async writePropertiesViaExec(containerName: string, fileContent: string) {
    const container = this.docker.getContainer(containerName);
    const exec = await container.exec({
      Cmd: ['sh', '-c', 'cat > /data/server.properties'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: true });
    
    return new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
      
      // Scrive il contenuto e chiude lo stream
      stream.write(fileContent);
      stream.end();
    });
  }

  private async writePropertiesViaCp(containerName: string, fileContent: string) {
    // Nota: dockerode putArchive richiede un tar stream. 
    // Per semplicità in questo ambiente senza tar-fs, usiamo exec come metodo primario.
    // Se exec fallisce e il bind mount è attivo, il file è già su disco.
    this.logger.log(`Fallback: il file dovrebbe essere già accessibile tramite bind mount per ${containerName}`);
  }

  private getSanitizedName(serverId: string): string {
    return serverId
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_.]/g, '');
  }

  private formatProperties(properties: Record<string, string>): string {
    const lines = [
      '#Minecraft server properties',
      `#${new Date().toString()}`
    ];
    
    for (const [key, value] of Object.entries(properties)) {
      lines.push(`${key}=${value}`);
    }
    
    return lines.join('\n') + '\n';
  }

  // RCON Connection Pooling
  private rconConnections = new Map<string, any>(); // serverId -> RCON client
  private connectionRetries = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  private async getRconConnection(serverId: string): Promise<any> {
    const containerName = this.getContainerName(serverId);
    
    // Check if we have an existing connection
    if (this.rconConnections.has(serverId)) {
      const connection = this.rconConnections.get(serverId);
      try {
        // Test if connection is still alive
        // For simplicity, we'll assume it's alive if it exists
        // In a real implementation, you'd send a ping command
        return connection;
      } catch (error) {
        // Connection is dead, remove it
        this.rconConnections.delete(serverId);
      }
    }

    // Get server RCON details from database
    const server = await this.getServerFromDatabase(serverId);
    if (!server || !server.rcon_password || !server.rcon_port) {
      throw new Error('RCON not configured for this server');
    }

    // Try to create a new connection
    try {
      // In a real implementation, you would use an RCON client library here
      // For this example, we'll simulate it with the exec approach
      const connection = {
        serverId,
        host: 'localhost', // In Docker, this would be the container IP
        port: server.rcon_port,
        password: server.rcon_password,
        lastUsed: Date.now()
      };
      
      this.rconConnections.set(serverId, connection);
      this.connectionRetries.delete(serverId); // Reset retry counter
      
      return connection;
    } catch (error) {
      // Implement retry logic with exponential backoff
      const retryCount = this.connectionRetries.get(serverId) || 0;
      if (retryCount < this.MAX_RETRIES) {
        this.connectionRetries.set(serverId, retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (retryCount + 1)));
        return this.getRconConnection(serverId); // Retry
      } else {
        throw new Error(`Failed to connect to RCON after ${this.MAX_RETRIES} attempts: ${error.message}`);
      }
    }
  }

  private async getServerFromDatabase(serverId: string): Promise<any> {
    // This is a placeholder - in a real implementation, you would inject PrismaService
    // and query the database for server details
    return {
      id: serverId,
      rcon_password: 'testpassword',
      rcon_port: 25575
    };
  }

  async executeRconCommandWithPooling(serverId: string, command: string): Promise<void> {
    const containerName = this.getContainerName(serverId);
    
    try {
      const container = this.docker.getContainer(containerName);
      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        this.logger.warn(`Container ${containerName} not running, skipping RCON command`);
        return;
      }

      // Get connection from pool
      const connection = await this.getRconConnection(serverId);
      
      // Execute command using the pooled connection
      // In a real implementation with a proper RCON client:
      // await connection.send(command);
      
      // For now, we'll use the exec approach as fallback
      const exec = await container.exec({
        Cmd: ['rcon-cli', command],
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = await exec.start({});
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      this.logger.log(`RCON command executed: ${command}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.warn(`Container ${containerName} not found, skipping RCON`);
        return;
      }
      this.logger.error(`RCON error for ${containerName}: ${error.message}`);
      throw error;
    }
  }

  // Clean up connections (could be called periodically)
  async cleanupRconConnections() {
    const now = Date.now();
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    for (const [serverId, connection] of this.rconConnections.entries()) {
      if (now - connection.lastUsed > INACTIVITY_TIMEOUT) {
        // Close connection
        // In a real implementation: await connection.end();
        this.rconConnections.delete(serverId);
        this.logger.log(`Closed inactive RCON connection for ${serverId}`);
      }
    }
  }
}
