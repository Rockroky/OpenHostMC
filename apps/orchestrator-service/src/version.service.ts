import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  // Run every 12 hours
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    this.logger.log('Starting version catalog update...');
    await this.updateVersions();
  }

  async onModuleInit() {
    // Initial fetch on startup
    await this.updateVersions();
  }

  async updateVersions() {
    try {
      const versions = {
        VANILLA: await this.fetchMojangVersions(),
        PAPER: await this.fetchPaperVersions(),
        FABRIC: await this.fetchFabricVersions(),
        // Placeholder for others as their APIs are more complex or less public
        QUILT: ['1.21.4', '1.21.1', '1.20.4'],
        FORGE: ['1.21.4', '1.21.1', '1.20.1'],
        NEOFORGE: ['1.21.4', '1.21.1'],
        MAGMA: ['1.20.1', '1.18.2'],
        MOHIST: ['1.20.1', '1.16.5'],
      };

      await this.redis.set('mc_versions', JSON.stringify(versions));
      this.logger.log('✅ Version catalog updated successfully');
    } catch (error) {
      this.logger.error('❌ Failed to update version catalog:', error.message);
    }
  }

  private async fetchMojangVersions() {
    try {
      const res = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json');
      return res.data.versions
        .filter((v: any) => v.type === 'release')
        .slice(0, 20)
        .map((v: any) => v.id);
    } catch (e) {
      this.logger.error('Failed to fetch Mojang versions');
      return [];
    }
  }

  private async fetchPaperVersions() {
    try {
      const res = await axios.get('https://api.papermc.io/v2/projects/paper');
      return res.data.versions.reverse().slice(0, 20);
    } catch (e) {
      this.logger.error('Failed to fetch Paper versions');
      return [];
    }
  }

  private async fetchFabricVersions() {
    try {
      const res = await axios.get('https://meta.fabricmc.net/v2/versions/game');
      return res.data
        .filter((v: any) => v.stable)
        .slice(0, 20)
        .map((v: any) => v.version);
    } catch (e) {
      this.logger.error('Failed to fetch Fabric versions');
      return [];
    }
  }

  async getVersions() {
    const cached = await this.redis.get('mc_versions');
    if (cached) return JSON.parse(cached);
    return null;
  }
}
