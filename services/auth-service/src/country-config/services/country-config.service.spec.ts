import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CountryConfigService } from './country-config.service';
import { PrismaService } from '../../database/prisma.service';

describe('CountryConfigService', () => {
  let service: CountryConfigService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    countryConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return Promise.all(callback);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CountryConfigService>(CountryConfigService);
    _prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      countryCode: 'US',
      countryName: 'United States',
      currencyCode: 'USD',
      currencySymbol: '$',
      defaultTimezone: 'America/New_York',
      region: 'Americas',
    };

    it('should create a new country config', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue(null);

      mockPrismaService.countryConfig.create.mockResolvedValue({
        id: 'config-1',
        ...createDto,
        standardWorkHoursPerWeek: 40,
        standardWorkDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        timezones: ['America/New_York'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.id).toBe('config-1');
      expect(result.countryCode).toBe('US');
      expect(mockPrismaService.countryConfig.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if country already exists', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue({
        id: 'existing-1',
        countryCode: 'US',
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByCountryCode', () => {
    it('should return country config by code', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        countryCode: 'US',
        countryName: 'United States',
        currencyCode: 'USD',
        defaultTimezone: 'America/New_York',
        standardWorkDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        timezones: ['America/New_York'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findByCountryCode('US');

      expect(result.countryCode).toBe('US');
      expect(result.countryName).toBe('United States');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue(null);

      await expect(service.findByCountryCode('XX')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update country config', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        countryCode: 'US',
      });

      mockPrismaService.countryConfig.update.mockResolvedValue({
        id: 'config-1',
        countryCode: 'US',
        countryName: 'United States of America',
        minAnnualLeaveDays: 15,
        updatedAt: new Date(),
      });

      const result = await service.update('US', {
        countryName: 'United States of America',
        minAnnualLeaveDays: 15,
      });

      expect(result.countryName).toBe('United States of America');
      expect(result.minAnnualLeaveDays).toBe(15);
    });

    it('should throw NotFoundException if config not found', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue(null);

      await expect(service.update('XX', { countryName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete country config', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        countryCode: 'US',
      });

      mockPrismaService.countryConfig.delete.mockResolvedValue({});

      await service.delete('US');

      expect(mockPrismaService.countryConfig.delete).toHaveBeenCalledWith({
        where: { countryCode: 'US' },
      });
    });

    it('should throw NotFoundException if config not found', async () => {
      mockPrismaService.countryConfig.findUnique.mockResolvedValue(null);

      await expect(service.delete('XX')).rejects.toThrow(NotFoundException);
    });
  });
});
