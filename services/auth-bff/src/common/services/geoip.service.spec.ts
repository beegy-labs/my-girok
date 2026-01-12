import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeoIPService } from './geoip.service';
import * as fs from 'fs';

vi.mock('fs');
vi.mock('@maxmind/geoip2-node/dist/src/reader', () => ({
  default: {
    open: vi.fn(),
  },
}));

describe('GeoIPService', () => {
  let service: GeoIPService;
  let configService: { get: ReturnType<typeof vi.fn> };

  const mockReader = {
    city: vi.fn(),
    metadata: {},
  };

  beforeEach(async () => {
    configService = {
      get: vi.fn().mockReturnValue('/var/lib/GeoIP/GeoLite2-City.mmdb'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoIPService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<GeoIPService>(GeoIPService);
  });

  describe('initialization', () => {
    it('should initialize successfully when database exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const Reader = (await import('@maxmind/geoip2-node/dist/src/reader')).default;
      vi.mocked(Reader.open).mockResolvedValue(mockReader as any);

      await service.onModuleInit();

      expect(service.isReady()).toBe(true);
    });

    it('should not initialize when database does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await service.onModuleInit();

      expect(service.isReady()).toBe(false);
    });
  });

  describe('getCountryCode', () => {
    it('should return country code for valid IP', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReader.city.mockReturnValue({
        country: { isoCode: 'US' },
      });

      // Manually set reader for testing
      (service as any).reader = mockReader;
      (service as any).isInitialized = true;

      const result = service.getCountryCode('8.8.8.8');

      expect(result).toBe('US');
      expect(mockReader.city).toHaveBeenCalledWith('8.8.8.8');
    });

    it('should return empty string when service is not initialized', () => {
      (service as any).isInitialized = false;

      const result = service.getCountryCode('8.8.8.8');

      expect(result).toBe('');
      expect(mockReader.city).not.toHaveBeenCalled();
    });

    it('should return empty string when lookup fails', () => {
      mockReader.city.mockImplementation(() => {
        throw new Error('Invalid IP');
      });

      (service as any).reader = mockReader;
      (service as any).isInitialized = true;

      const result = service.getCountryCode('invalid-ip');

      expect(result).toBe('');
    });
  });

  describe('getLocation', () => {
    it('should return detailed location info for valid IP', () => {
      mockReader.city.mockReturnValue({
        country: { isoCode: 'US', names: { en: 'United States' } },
        city: { names: { en: 'Mountain View' } },
        location: { latitude: 37.386, longitude: -122.0838 },
      });

      (service as any).reader = mockReader;
      (service as any).isInitialized = true;

      const result = service.getLocation('8.8.8.8');

      expect(result).toEqual({
        countryCode: 'US',
        countryName: 'United States',
        city: 'Mountain View',
        latitude: 37.386,
        longitude: -122.0838,
      });
    });

    it('should return null when service is not initialized', () => {
      (service as any).isInitialized = false;

      const result = service.getLocation('8.8.8.8');

      expect(result).toBeNull();
    });

    it('should return null when lookup fails', () => {
      mockReader.city.mockImplementation(() => {
        throw new Error('Invalid IP');
      });

      (service as any).reader = mockReader;
      (service as any).isInitialized = true;

      const result = service.getLocation('invalid-ip');

      expect(result).toBeNull();
    });
  });

  describe('batchGetCountryCodes', () => {
    it('should return country codes for multiple IPs', () => {
      mockReader.city
        .mockReturnValueOnce({ country: { isoCode: 'US' } })
        .mockReturnValueOnce({ country: { isoCode: 'KR' } })
        .mockReturnValueOnce({ country: { isoCode: 'JP' } });

      (service as any).reader = mockReader;
      (service as any).isInitialized = true;

      const result = service.batchGetCountryCodes(['8.8.8.8', '1.1.1.1', '9.9.9.9']);

      expect(result.size).toBe(3);
      expect(result.get('8.8.8.8')).toBe('US');
      expect(result.get('1.1.1.1')).toBe('KR');
      expect(result.get('9.9.9.9')).toBe('JP');
    });

    it('should skip IPs that fail lookup', () => {
      mockReader.city
        .mockReturnValueOnce({ country: { isoCode: 'US' } })
        .mockImplementationOnce(() => {
          throw new Error('Invalid IP');
        })
        .mockReturnValueOnce({ country: { isoCode: 'JP' } });

      (service as any).reader = mockReader;
      (service as any).isInitialized = true;

      const result = service.batchGetCountryCodes(['8.8.8.8', 'invalid-ip', '9.9.9.9']);

      expect(result.size).toBe(2);
      expect(result.get('8.8.8.8')).toBe('US');
      expect(result.get('invalid-ip')).toBeUndefined();
      expect(result.get('9.9.9.9')).toBe('JP');
    });
  });

  describe('getDatabaseInfo', () => {
    it('should return true when service is initialized', () => {
      (service as any).isInitialized = true;

      const result = service.getDatabaseInfo();

      expect(result).toBe(true);
    });

    it('should return false when service is not initialized', () => {
      (service as any).isInitialized = false;

      const result = service.getDatabaseInfo();

      expect(result).toBe(false);
    });
  });
});
