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
  private readonly BASE_PATH =
    process.env.SERVER_DATA_PATH || path.join(process.cwd(), 'servers');

  private getServerPath(serverId: string): string {
    if (!serverId || !/^[a-zA-Z0-9_-]+$/.test(serverId)) {
      throw new BadRequestException('ID server non valido');
    }
    const resolvedBase = path.resolve(this.BASE_PATH);
    const resolvedServerPath = path.resolve(resolvedBase, serverId);
    if (
      !resolvedServerPath.startsWith(resolvedBase + path.sep) &&
      resolvedServerPath !== resolvedBase
    ) {
      throw new BadRequestException("Path traversal rilevato nell'ID server");
    }
    return resolvedServerPath;
  }

  async uploadBulk(serverId: string, files: Express.Multer.File[]) {
    const serverPath = this.getServerPath(serverId);
    const modsPath = path.resolve(serverPath, 'mods');

    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }

    const results: any[] = [];

    for (const file of files) {
      const originalName = file.originalname || '';

      // Strict path traversal and character check
      if (
        originalName.includes('..') ||
        originalName.includes('/') ||
        originalName.includes('\\') ||
        originalName.includes('\0')
      ) {
        results.push({
          file: originalName,
          status: 'rejected',
          reason: 'Caratteri di percorso malevoli',
        });
        continue;
      }

      const fileName = path.basename(originalName).trim();
      if (!/^[a-zA-Z0-9_\-\. ]+$/.test(fileName) || fileName.startsWith('.')) {
        results.push({
          file: originalName,
          status: 'rejected',
          reason: 'Nome file non consentito o nascosto',
        });
        continue;
      }

      // Security: only .jar or .zip
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== '.jar' && ext !== '.zip') {
        results.push({
          file: fileName,
          status: 'rejected',
          reason: 'Tipo di file non consentito (solo .jar o .zip)',
        });
        continue;
      }

      const filePath = path.resolve(modsPath, fileName);
      if (!filePath.startsWith(modsPath + path.sep)) {
        results.push({
          file: fileName,
          status: 'rejected',
          reason: 'Directory traversal rilevato',
        });
        continue;
      }

      fs.writeFileSync(filePath, file.buffer);

      if (fileName.endsWith('.zip')) {
        try {
          await this.extractModpack(serverId, filePath);
          results.push({ file: fileName, status: 'extracted' });
          // Delete the zip after extraction
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          this.logger.error(
            `Failed to extract modpack ${fileName}: ${error.message}`,
          );
          results.push({
            file: fileName,
            status: 'error',
            reason: error.message || 'Estrazione fallita',
          });
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
    const zipEntries = zip.getEntries();

    // Prevent Zip Slip vulnerability: validate each entry's target destination
    for (const entry of zipEntries) {
      const entryName = entry.entryName;
      if (entryName.includes('\0')) {
        throw new BadRequestException(
          'Archivio zip malevolo rilevato (null byte)',
        );
      }
      const normalizedPath = path
        .normalize(entryName)
        .replace(/^(\.\.[\/\\])+/, '');
      if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        throw new BadRequestException(
          'Zip Slip rilevato: percorso archivio non sicuro',
        );
      }
      const destinationPath = path.resolve(serverPath, normalizedPath);
      if (
        !destinationPath.startsWith(serverPath + path.sep) &&
        destinationPath !== serverPath
      ) {
        throw new BadRequestException(
          'Zip Slip rilevato: percorso archivio tenta di uscire dalla cartella del server',
        );
      }
    }

    // Safely extract
    zip.extractAllTo(serverPath, true);
    this.logger.log(`Extracted modpack securely to ${serverPath}`);
  }

  async exportMods(serverId: string, res: Response) {
    const serverPath = this.getServerPath(serverId);
    const modsPath = path.resolve(serverPath, 'mods');

    if (!fs.existsSync(modsPath)) {
      throw new BadRequestException('Cartella mods non trovata');
    }

    const archive = (archiver as any)('zip', {
      zlib: { level: 9 },
    });

    res.attachment(`mods_${serverId}.zip`);

    archive.pipe(res);
    archive.directory(modsPath, false);
    await archive.finalize();
  }

  async exportWorld(serverId: string, res: Response) {
    const serverPath = this.getServerPath(serverId);
    const worldPath = path.resolve(serverPath, 'world');

    if (!fs.existsSync(worldPath)) {
      throw new BadRequestException('Nessun mondo trovato da esportare');
    }

    const archive = (archiver as any)('zip', {
      zlib: { level: 9 },
    });

    res.attachment(`world_${serverId}.zip`);

    archive.pipe(res);
    archive.directory(worldPath, false);
    await archive.finalize();
  }

  async listFiles(serverId: string, relativePath: string = '') {
    const serverPath = this.getServerPath(serverId);

    if (relativePath.includes('..') || relativePath.includes('\0')) {
      throw new BadRequestException(
        'Path non valido: Directory Traversal rilevato',
      );
    }

    const normalized = path
      .normalize(relativePath)
      .replace(/^(\.\.[\/\\])+/, '');
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new BadRequestException(
        'Path non valido: Directory Traversal rilevato',
      );
    }

    const fullPath = path.resolve(serverPath, normalized);
    if (!fullPath.startsWith(serverPath)) {
      throw new BadRequestException(
        'Path non valido: Accesso fuori dalla cartella server negato',
      );
    }

    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException('Percorso non trovato');
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) {
      return { type: 'file', content: fs.readFileSync(fullPath, 'utf8') };
    }

    const files = fs.readdirSync(fullPath);
    return files
      .map((file) => {
        const entryPath = path.resolve(fullPath, file);
        // Ensure entry is within fullPath
        if (!entryPath.startsWith(fullPath)) {
          return null;
        }
        const fileStats = fs.statSync(entryPath);
        return {
          name: file,
          isDirectory: fileStats.isDirectory(),
          size: fileStats.size,
          mtime: fileStats.mtime,
        };
      })
      .filter(Boolean);
  }
}
