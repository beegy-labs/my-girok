import {
  GRPC_PORTS,
  GRPC_SERVICES,
  GRPC_PACKAGES,
  createIdentityGrpcOptions,
  createAuthGrpcOptions,
  createLegalGrpcOptions,
  loadGrpcConfigFromEnv,
} from '../grpc.options';
import { GrpcOptions, Transport } from '@nestjs/microservices';

describe('gRPC Options', () => {
  describe('constants', () => {
    it('should define correct ports', () => {
      expect(GRPC_PORTS.IDENTITY).toBe(50051);
      expect(GRPC_PORTS.AUTH).toBe(50052);
      expect(GRPC_PORTS.LEGAL).toBe(50053);
    });

    it('should define correct service names', () => {
      expect(GRPC_SERVICES.IDENTITY).toBe('IDENTITY_GRPC_SERVICE');
      expect(GRPC_SERVICES.AUTH).toBe('AUTH_GRPC_SERVICE');
      expect(GRPC_SERVICES.LEGAL).toBe('LEGAL_GRPC_SERVICE');
    });

    it('should define correct package names', () => {
      expect(GRPC_PACKAGES.IDENTITY).toBe('identity.v1');
      expect(GRPC_PACKAGES.AUTH).toBe('auth.v1');
      expect(GRPC_PACKAGES.LEGAL).toBe('legal.v1');
    });
  });

  describe('createIdentityGrpcOptions', () => {
    it('should create options with default values', () => {
      const options = createIdentityGrpcOptions() as GrpcOptions;

      expect(options.transport).toBe(Transport.GRPC);
      expect(options.options).toBeDefined();
      expect(options.options?.package).toBe('identity.v1');
      expect(options.options?.url).toBe('localhost:50051');
    });

    it('should use custom host and port', () => {
      const options = createIdentityGrpcOptions({
        host: 'identity-service',
        port: 9999,
      }) as GrpcOptions;

      expect(options.options?.url).toBe('identity-service:9999');
    });

    it('should use custom proto path', () => {
      const options = createIdentityGrpcOptions({
        protoPath: '/custom/path/identity.proto',
      }) as GrpcOptions;

      expect(options.options?.protoPath).toBe('/custom/path/identity.proto');
    });
  });

  describe('createAuthGrpcOptions', () => {
    it('should create options with default values', () => {
      const options = createAuthGrpcOptions() as GrpcOptions;

      expect(options.transport).toBe(Transport.GRPC);
      expect(options.options?.package).toBe('auth.v1');
      expect(options.options?.url).toBe('localhost:50052');
    });

    it('should use custom configuration', () => {
      const options = createAuthGrpcOptions({
        host: 'auth-service',
        port: 8888,
      }) as GrpcOptions;

      expect(options.options?.url).toBe('auth-service:8888');
    });
  });

  describe('createLegalGrpcOptions', () => {
    it('should create options with default values', () => {
      const options = createLegalGrpcOptions() as GrpcOptions;

      expect(options.transport).toBe(Transport.GRPC);
      expect(options.options?.package).toBe('legal.v1');
      expect(options.options?.url).toBe('localhost:50053');
    });

    it('should use custom configuration', () => {
      const options = createLegalGrpcOptions({
        host: 'legal-service',
        port: 7777,
      }) as GrpcOptions;

      expect(options.options?.url).toBe('legal-service:7777');
    });
  });

  describe('loadGrpcConfigFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return undefined values when env vars not set', () => {
      const config = loadGrpcConfigFromEnv();

      expect(config.identityHost).toBeUndefined();
      expect(config.identityPort).toBeUndefined();
      expect(config.authHost).toBeUndefined();
      expect(config.authPort).toBeUndefined();
      expect(config.legalHost).toBeUndefined();
      expect(config.legalPort).toBeUndefined();
    });

    it('should load values from environment', () => {
      process.env.IDENTITY_GRPC_HOST = 'identity.local';
      process.env.IDENTITY_GRPC_PORT = '50051';
      process.env.AUTH_GRPC_HOST = 'auth.local';
      process.env.AUTH_GRPC_PORT = '50052';
      process.env.LEGAL_GRPC_HOST = 'legal.local';
      process.env.LEGAL_GRPC_PORT = '50053';

      const config = loadGrpcConfigFromEnv();

      expect(config.identityHost).toBe('identity.local');
      expect(config.identityPort).toBe(50051);
      expect(config.authHost).toBe('auth.local');
      expect(config.authPort).toBe(50052);
      expect(config.legalHost).toBe('legal.local');
      expect(config.legalPort).toBe(50053);
    });
  });
});
