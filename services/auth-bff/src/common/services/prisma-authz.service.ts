import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AuthorizationModel {
  id: string;
  versionId: string;
  schemaVersion: string;
  dslSource: string;
  compiledModel: unknown;
  typeDefinitions: unknown;
  isActive: boolean | null;
  createdAt: Date | null;
}

interface Team {
  id: string;
  name: string;
  displayName: string;
  serviceId: string | null;
  description: string | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PrismaClientInterface {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(fn: (tx: PrismaClientInterface) => Promise<T>): Promise<T>;
  authorizationModel: {
    findFirst(args?: unknown): Promise<AuthorizationModel | null>;
    findMany(args?: unknown): Promise<AuthorizationModel[]>;
    findUnique(args: unknown): Promise<AuthorizationModel | null>;
    create(args: unknown): Promise<AuthorizationModel>;
    update(args: unknown): Promise<AuthorizationModel>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  team: {
    findMany(args?: unknown): Promise<Team[]>;
    findUnique(args: unknown): Promise<Team | null>;
    count(args?: unknown): Promise<number>;
    create(args: unknown): Promise<Team>;
    update(args: unknown): Promise<Team>;
    delete(args: unknown): Promise<Team>;
  };
}

/**
 * Prisma client for authorization-service database
 * Used for accessing teams and authorization models
 */
@Injectable()
export class PrismaAuthzService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaAuthzService.name);
  private client: PrismaClientInterface | null = null;

  authorizationModel!: PrismaClientInterface['authorizationModel'];
  team!: PrismaClientInterface['team'];
  $transaction!: PrismaClientInterface['$transaction'];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>(
      'authorizationDb.url',
      'postgresql://postgres:postgres@localhost:5432/authorization_service',
    );

    try {
      const prismaModule = await import('@prisma/client');
      const DynamicPrismaClient = prismaModule.default || (prismaModule as any).PrismaClient;

      this.client = new DynamicPrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      }) as unknown as PrismaClientInterface;

      this.authorizationModel = this.client.authorizationModel;
      this.team = this.client.team;
      this.$transaction = this.client.$transaction.bind(this.client);

      await this.client.$connect();
      this.logger.log('Connected to authorization database');
    } catch (error) {
      this.logger.warn(`Failed to connect to authorization database: ${error}`);
      this.logger.warn('Authorization and Teams features will be disabled');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
      this.logger.log('Disconnected from authorization database');
    }
  }
}
