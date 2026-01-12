/**
 * GeoIP Service
 *
 * Converts IP addresses to country codes using MaxMind GeoLite2 database.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Reader from '@maxmind/geoip2-node/dist/src/reader';
import { existsSync } from 'fs';

export interface GeoIPResult {
  countryCode: string;
  countryName?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeoIPDatabaseInfo {
  isInitialized: boolean;
  databaseType?: string;
  buildDate?: Date;
  description?: string;
  ipVersion?: number;
  nodeCount?: number;
  recordSize?: number;
}

@Injectable()
export class GeoIPService implements OnModuleInit {
  private readonly logger = new Logger(GeoIPService.name);
  private reader?: any; // ReaderModel doesn't have metadata property, use any for now
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    try {
      const dbPath = this.configService.get<string>(
        'geoip.databasePath',
        '/var/lib/GeoIP/GeoLite2-City.mmdb',
      );

      if (!existsSync(dbPath)) {
        this.logger.warn(
          `GeoIP database not found at ${dbPath}. IP geolocation will not be available.`,
        );
        return;
      }

      this.reader = await Reader.open(dbPath);
      this.isInitialized = true;
      this.logger.log(`GeoIP service initialized with database: ${dbPath}`);
    } catch (error) {
      this.logger.error(`Failed to initialize GeoIP service: ${error}`);
    }
  }

  /**
   * Get country code from IP address
   */
  getCountryCode(ip: string): string {
    if (!this.isInitialized || !this.reader) {
      return '';
    }

    try {
      const response = this.reader.city(ip);
      return response.country?.isoCode || '';
    } catch (error) {
      // Log at debug level since many IPs may be invalid or private
      this.logger.debug(`Failed to lookup IP ${ip}: ${error}`);
      return '';
    }
  }

  /**
   * Get detailed geolocation information from IP address
   */
  getLocation(ip: string): GeoIPResult | null {
    if (!this.isInitialized || !this.reader) {
      return null;
    }

    try {
      const response = this.reader.city(ip);

      return {
        countryCode: response.country?.isoCode || '',
        countryName: response.country?.names?.en,
        city: response.city?.names?.en,
        latitude: response.location?.latitude,
        longitude: response.location?.longitude,
      };
    } catch (error) {
      this.logger.debug(`Failed to lookup IP ${ip}: ${error}`);
      return null;
    }
  }

  /**
   * Batch lookup country codes for multiple IPs
   */
  batchGetCountryCodes(ips: string[]): Map<string, string> {
    const results = new Map<string, string>();

    for (const ip of ips) {
      const countryCode = this.getCountryCode(ip);
      if (countryCode) {
        results.set(ip, countryCode);
      }
    }

    return results;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get database metadata
   */
  getDatabaseInfo(): GeoIPDatabaseInfo {
    if (!this.isInitialized || !this.reader) {
      return { isInitialized: false };
    }

    const metadata = this.reader.metadata;

    return {
      isInitialized: true,
      databaseType: metadata.databaseType,
      buildDate: new Date(metadata.buildEpoch * 1000),
      description: metadata.description?.en,
      ipVersion: metadata.ipVersion,
      nodeCount: metadata.nodeCount,
      recordSize: metadata.recordSize,
    };
  }
}
