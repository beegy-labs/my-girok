import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { AuditQueryService } from '../../src/audit/services/audit-query.service';
import { ClickHouseService } from '../../src/shared/clickhouse/clickhouse.service';

describe('AuditQueryService', () => {
  let service: AuditQueryService;
  let clickhouseService: {
    query: MockInstance;
  };

  const mockAuditLogRow = {
    id: 'log-123',
    timestamp: '2026-01-12T10:00:00.000Z',
    user_id: 'user-123',
    action: 'login',
    resource: 'auth/login',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    metadata: JSON.stringify({ success: true, method: 'password' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditQueryService,
        {
          provide: ClickHouseService,
          useValue: {
            query: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditQueryService>(AuditQueryService);
    clickhouseService = module.get(ClickHouseService);
  });

  describe('getAccessLogs', () => {
    it('should return paginated access logs', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '10' }] })
        .mockResolvedValueOnce({ data: [mockAuditLogRow] });

      const query = {
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        page: 1,
        limit: 20,
      };

      const result = await service.getAccessLogs(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.data[0]).toEqual({
        id: 'log-123',
        timestamp: '2026-01-12T10:00:00.000Z',
        userId: 'user-123',
        action: 'login',
        resource: 'auth/login',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome/120.0',
        metadata: { success: true, method: 'password' },
      });
    });

    it('should apply userId filter', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '5' }] })
        .mockResolvedValueOnce({ data: [] });

      await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        userId: 'user-123',
        page: 1,
        limit: 20,
      });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = {userId:String}'),
        expect.objectContaining({ userId: 'user-123' }),
      );
    });

    it('should apply action filter', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '3' }] })
        .mockResolvedValueOnce({ data: [] });

      await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        action: 'login',
        page: 1,
        limit: 20,
      });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('action = {action:String}'),
        expect.objectContaining({ action: 'login' }),
      );
    });

    it('should apply resource filter with LIKE', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '2' }] })
        .mockResolvedValueOnce({ data: [] });

      await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        resource: 'auth',
        page: 1,
        limit: 20,
      });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('resource LIKE {resource:String}'),
        expect.objectContaining({ resource: '%auth%' }),
      );
    });

    it('should apply all filters together', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '1' }] })
        .mockResolvedValueOnce({ data: [] });

      await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        userId: 'user-123',
        action: 'login',
        resource: 'auth',
        page: 1,
        limit: 20,
      });

      const callArgs = clickhouseService.query.mock.calls[0];
      expect(callArgs[0]).toContain('user_id = {userId:String}');
      expect(callArgs[0]).toContain('action = {action:String}');
      expect(callArgs[0]).toContain('resource LIKE {resource:String}');
      expect(callArgs[1]).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          action: 'login',
          resource: '%auth%',
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '100' }] })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
        page: 3,
        limit: 10,
      });

      expect(result.totalPages).toBe(10);
      expect(result.page).toBe(3);
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10,
          offset: 20, // (page 3 - 1) * 10
        }),
      );
    });

    it('should use default pagination values', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '50' }] })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    it('should handle empty results', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '0' }] })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should parse metadata JSON correctly', async () => {
      const logWithComplexMetadata = {
        ...mockAuditLogRow,
        metadata: JSON.stringify({
          nested: { field: 'value' },
          array: [1, 2, 3],
          boolean: true,
        }),
      };

      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '1' }] })
        .mockResolvedValueOnce({ data: [logWithComplexMetadata] });

      const result = await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(result.data[0].metadata).toEqual({
        nested: { field: 'value' },
        array: [1, 2, 3],
        boolean: true,
      });
    });

    it('should handle null metadata', async () => {
      const logWithoutMetadata = {
        ...mockAuditLogRow,
        metadata: null,
      };

      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '1' }] })
        .mockResolvedValueOnce({ data: [logWithoutMetadata] });

      const result = await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(result.data[0].metadata).toBeUndefined();
    });

    it('should order results by timestamp DESC', async () => {
      clickhouseService.query
        .mockResolvedValueOnce({ data: [{ total: '1' }] })
        .mockResolvedValueOnce({ data: [] });

      await service.getAccessLogs({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-31T23:59:59Z',
      });

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        expect.any(Object),
      );
    });
  });

  describe('getAccessLogById', () => {
    it('should return access log by id', async () => {
      clickhouseService.query.mockResolvedValue({ data: [mockAuditLogRow] });

      const result = await service.getAccessLogById('log-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('log-123');
      expect(result?.userId).toBe('user-123');
      expect(result?.action).toBe('login');
      expect(result?.metadata).toEqual({ success: true, method: 'password' });
    });

    it('should return null when log not found', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      const result = await service.getAccessLogById('nonexistent');

      expect(result).toBeNull();
    });

    it('should query with correct SQL', async () => {
      clickhouseService.query.mockResolvedValue({ data: [] });

      await service.getAccessLogById('log-123');

      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = {id:String}'),
        { id: 'log-123' },
      );
      expect(clickhouseService.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.any(Object),
      );
    });

    it('should handle null metadata', async () => {
      const logWithoutMetadata = {
        ...mockAuditLogRow,
        metadata: null,
      };

      clickhouseService.query.mockResolvedValue({ data: [logWithoutMetadata] });

      const result = await service.getAccessLogById('log-123');

      expect(result?.metadata).toBeUndefined();
    });

    it('should parse metadata JSON', async () => {
      const logWithMetadata = {
        ...mockAuditLogRow,
        metadata: JSON.stringify({ key: 'value', num: 42 }),
      };

      clickhouseService.query.mockResolvedValue({ data: [logWithMetadata] });

      const result = await service.getAccessLogById('log-123');

      expect(result?.metadata).toEqual({ key: 'value', num: 42 });
    });
  });
});
