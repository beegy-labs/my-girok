import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as maxmind from 'maxmind';
import { CountryResponse } from 'maxmind';
import { existsSync } from 'fs';

/**
 * GeoIP Service using MaxMind GeoLite2
 *
 * Setup instructions:
 * 1. Download GeoLite2-Country.mmdb from MaxMind
 * 2. Place it in /data/geoip/GeoLite2-Country.mmdb
 * 3. Set GEOIP_DATABASE_PATH environment variable (optional)
 */
@Injectable()
export class GeoIPService implements OnModuleInit {
  private readonly logger = new Logger(GeoIPService.name);
  private reader: maxmind.Reader<CountryResponse> | null = null;
  private isReady = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const defaultPath = '/data/geoip/GeoLite2-Country.mmdb';
    const dbPath =
      this.configService.get<string>('geoip.databasePath') ||
      process.env.GEOIP_DATABASE_PATH ||
      defaultPath;

    try {
      if (!existsSync(dbPath)) {
        this.logger.warn(`GeoIP database not found at ${dbPath}. GeoIP lookups will be disabled.`);
        this.logger.warn(
          'To enable GeoIP: Download GeoLite2-Country.mmdb from MaxMind and place it at the specified path.',
        );
        return;
      }

      this.reader = await maxmind.open<CountryResponse>(dbPath);
      this.isReady = true;
      this.logger.log(`GeoIP database loaded successfully from ${dbPath}`);
    } catch (error) {
      this.logger.warn(`Failed to load GeoIP database: ${error}`);
      this.logger.warn('GeoIP lookups will be disabled.');
    }
  }

  /**
   * Get country code from IP address
   * @param ipAddress - IPv4 or IPv6 address
   * @returns ISO 3166-1 alpha-2 country code (e.g., 'US', 'KR') or null
   */
  getCountryCode(ipAddress: string): string | null {
    if (!this.isReady || !this.reader) {
      return null;
    }

    try {
      const result = this.reader.get(ipAddress);

      if (result && result.country && result.country.iso_code) {
        return result.country.iso_code;
      }

      return null;
    } catch (error) {
      this.logger.debug(`Failed to lookup IP ${ipAddress}: ${error}`);
      return null;
    }
  }

  /**
   * Get country information from IP address
   * @param ipAddress - IPv4 or IPv6 address
   * @returns Country information or null
   */
  getCountryInfo(ipAddress: string): {
    code: string;
    name: string;
  } | null {
    if (!this.isReady || !this.reader) {
      return null;
    }

    try {
      const result = this.reader.get(ipAddress);

      if (result && result.country) {
        return {
          code: result.country.iso_code || '',
          name: result.country.names?.en || '',
        };
      }

      return null;
    } catch (error) {
      this.logger.debug(`Failed to lookup IP ${ipAddress}: ${error}`);
      return null;
    }
  }

  /**
   * Check if GeoIP service is ready
   */
  isServiceReady(): boolean {
    return this.isReady;
  }

  /**
   * Anonymize IP address for GDPR compliance
   * Zeros out the last octet for IPv4, last 80 bits for IPv6
   */
  anonymizeIP(ipAddress: string): string {
    if (ipAddress.includes(':')) {
      // IPv6
      const parts = ipAddress.split(':');
      if (parts.length >= 5) {
        return parts.slice(0, 4).join(':') + '::';
      }
      return ipAddress;
    } else {
      // IPv4
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
      return ipAddress;
    }
  }
}
