import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import AdmZip from 'adm-zip';
import type { Response } from 'express';
import 'multer';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly BASE_PATH = process.env.SERVER_DATA_PATH || path.join(process.cwd(), 'servers');

  private getServerPath(serverId: string) {
    return path.join(this.BASE_PATH, serverId);
  }

  async uploadBulk(serverId: string, files: Express.Multer.File[]) {
    const serverPath = this.getServerPath(serverId);
    const modsPath = path.join(serverPath, 'mods');

    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }

    const results: any[] = [];

    for (const file of files) {
      const fileName = file.originalname;
      
      // Security: only .jar or .zip
      if (!fileName.endsWith('.jar') && !fileName.endsWith('.zip')) {
        results.push({ file: fileName, status: 'rejected', reason: 'Invalid file type' });
        continue;
      }

      const filePath = path.join(modsPath, fileName);
      fs.writeFileSync(filePath, file.buffer);

      if (fileName.endsWith('.zip')) {
        try {
          await this.extractModpack(serverId, filePath);
          results.push({ file: fileName, status: 'extracted' });
          // Optionally delete the zip after extraction
          fs.unlinkSync(filePath);
        } catch (error) {
          this.logger.error(`Failed to extract modpack ${fileName}: ${error.message}`);
          results.push({ file: fileName, status: 'error', reason: 'Extraction failed' });
        }
      } else {
        results.push({ file: fileName, status: 'uploaded' });
      }
    }

    return results;
  }

  async extractModpack(serverId: string, zipPath: string) {
    const serverPath = this.getServerPath(serverId);
    const zip = new AdmZip(zipPath);
    
    // Logic to identify where to extract
    // Usually modpacks have a specific structure. We'll try to extract into the server root
    // and let it merge /mods, /config, etc.
    zip.extractAllTo(serverPath, true);
    this.logger.log(`Extracted modpack to ${serverPath}`);
  }

  async exportMods(serverId: string, res: Response) {
    const serverPath = this.getServerPath(serverId);
    const modsPath = path.join(serverPath, 'mods');

    if (!fs.existsSync(modsPath)) {
      throw new BadRequestException('Mods folder not found');
    }

    const archive = (archiver as any)('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`mods_${serverId}.zip`);

    archive.pipe(res);
    archive.directory(modsPath, false);
    await archive.finalize();
  }

  async exportWorld(serverId: string, res: Response) {
    const serverPath = this.getServerPath(serverId);
    const worldPath = path.join(serverPath, 'world'); // default world name for most servers

    if (!fs.existsSync(worldPath)) {
      throw new BadRequestException('Nessun mondo trovato da esportare');
    }

    const archive = (archiver as any)('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`world_${serverId}.zip`);

    archive.pipe(res);
    archive.directory(worldPath, false);
    await archive.finalize();
  }

  async listFiles(serverId: string, relativePath: string = '') {
    const fullPath = path.join(this.getServerPath(serverId), relativePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException('Path not found');
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) {
      return { type: 'file', content: fs.readFileSync(fullPath, 'utf8') };
    }

    const files = fs.readdirSync(fullPath);
    return files.map(file => {
      const fileStats = fs.statSync(path.join(fullPath, file));
      return {
        name: file,
        isDirectory: fileStats.isDirectory(),
        size: fileStats.size,
        mtime: fileStats.mtime,
      };
    });
  }
}
