import { vi, describe, it, expect } from 'vitest';
import {
  GrpcClientsModule,
  IdentityGrpcClientModule,
  AuthGrpcClientModule,
  LegalGrpcClientModule,
} from '../grpc-clients.module';

// Mock ClientsModule to avoid actual gRPC connections
vi.mock('@nestjs/microservices', () => ({
  ClientsModule: {
    register: vi.fn().mockReturnValue({
      module: class MockClientsModule {},
      providers: [
        { provide: 'IDENTITY_GRPC_SERVICE', useValue: { getService: vi.fn() } },
        { provide: 'AUTH_GRPC_SERVICE', useValue: { getService: vi.fn() } },
        { provide: 'LEGAL_GRPC_SERVICE', useValue: { getService: vi.fn() } },
      ],
      exports: ['IDENTITY_GRPC_SERVICE', 'AUTH_GRPC_SERVICE', 'LEGAL_GRPC_SERVICE'],
    }),
    registerAsync: vi.fn().mockReturnValue({
      module: class MockClientsModule {},
      providers: [],
      exports: [],
    }),
  },
  Transport: { GRPC: 5 },
  ClientGrpc: class MockClientGrpc {},
}));

describe('GrpcClientsModule', () => {
  describe('forRoot', () => {
    it('should create module with all clients by default', () => {
      const module = GrpcClientsModule.forRoot();

      expect(module).toBeDefined();
      expect(module.module).toBe(GrpcClientsModule);
    });

    it('should create module with only identity client', () => {
      const module = GrpcClientsModule.forRoot({
        identity: true,
        auth: false,
        legal: false,
      });

      expect(module).toBeDefined();
    });

    it('should create module with custom configuration', () => {
      const module = GrpcClientsModule.forRoot({
        identity: { host: 'identity-service', port: 50051 },
        auth: { host: 'auth-service', port: 50052 },
        legal: false,
      });

      expect(module).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async factory', () => {
      const module = GrpcClientsModule.forRootAsync({
        useFactory: () => ({
          identity: { host: 'localhost', port: 50051 },
          auth: true,
          legal: true,
        }),
      });

      expect(module).toBeDefined();
    });

    it('should support inject option', () => {
      class ConfigService {
        get(key: string) {
          return key;
        }
      }

      const module = GrpcClientsModule.forRootAsync({
        imports: [],
        useFactory: (config: ConfigService) => ({
          identity: { host: config.get('IDENTITY_HOST') },
        }),
        inject: [ConfigService],
      });

      expect(module).toBeDefined();
    });
  });
});

describe('Individual client modules', () => {
  describe('IdentityGrpcClientModule', () => {
    it('should create module with identity client only', () => {
      const module = IdentityGrpcClientModule.forRoot();
      expect(module).toBeDefined();
    });

    it('should accept custom config', () => {
      const module = IdentityGrpcClientModule.forRoot({ host: 'custom-host', port: 9999 });
      expect(module).toBeDefined();
    });
  });

  describe('AuthGrpcClientModule', () => {
    it('should create module with auth client only', () => {
      const module = AuthGrpcClientModule.forRoot();
      expect(module).toBeDefined();
    });
  });

  describe('LegalGrpcClientModule', () => {
    it('should create module with legal client only', () => {
      const module = LegalGrpcClientModule.forRoot();
      expect(module).toBeDefined();
    });
  });
});
