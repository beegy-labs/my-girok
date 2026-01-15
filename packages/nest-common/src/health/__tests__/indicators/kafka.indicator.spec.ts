import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { KafkaHealthIndicator, KafkaHealthCheckAdapter } from '../../indicators/kafka.indicator';

describe('KafkaHealthIndicator', () => {
  let indicator: KafkaHealthIndicator;
  let mockKafka: {
    isConnected?: Mock;
  };

  beforeEach(() => {
    mockKafka = {
      isConnected: vi.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should have name set to kafka', () => {
      indicator = new KafkaHealthIndicator(mockKafka);
      expect(indicator.name).toBe('kafka');
    });

    it('should default to non-critical', () => {
      indicator = new KafkaHealthIndicator(mockKafka);
      expect(indicator.critical).toBe(false);
    });

    it('should allow setting critical to true', () => {
      indicator = new KafkaHealthIndicator(mockKafka, { critical: true });
      expect(indicator.critical).toBe(true);
    });
  });

  describe('check', () => {
    beforeEach(() => {
      indicator = new KafkaHealthIndicator(mockKafka);
    });

    it('should return up status when Kafka is connected', async () => {
      mockKafka.isConnected!.mockResolvedValue(true);

      const result = await indicator.check();

      expect(result.status).toBe('up');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return down status when Kafka is not connected', async () => {
      mockKafka.isConnected!.mockResolvedValue(false);

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Kafka producer not connected');
    });

    it('should return down status when isConnected throws', async () => {
      mockKafka.isConnected!.mockRejectedValue(new Error('Connection error'));

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Connection error');
    });

    it('should handle non-Error exceptions', async () => {
      mockKafka.isConnected!.mockRejectedValue('Unknown error');

      const result = await indicator.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('Kafka connection failed');
    });

    it('should return up with note when isConnected method is not available', async () => {
      const kafkaWithoutIsConnected: KafkaHealthCheckAdapter = {};
      indicator = new KafkaHealthIndicator(kafkaWithoutIsConnected);

      const result = await indicator.check();

      expect(result.status).toBe('up');
      expect(result.details?.note).toBe('Connection status check not available');
    });

    it('should measure latency correctly', async () => {
      mockKafka.isConnected!.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 50)),
      );

      const result = await indicator.check();

      expect(result.latencyMs).toBeGreaterThanOrEqual(50);
      expect(result.latencyMs).toBeLessThan(100);
    });
  });
});
