import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { TupleRepository, ModelRepository, TeamRepository, ChangelogRepository } from './storage';
import { CheckEngine } from './engine';
import { PermissionCache } from './cache';
import { AuthorizationGrpcController } from './grpc';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
  ],
  controllers: [AuthorizationGrpcController, HealthController],
  providers: [
    // Storage
    TupleRepository,
    ModelRepository,
    TeamRepository,
    ChangelogRepository,

    // Engine
    CheckEngine,

    // Cache
    PermissionCache,
  ],
  exports: [TupleRepository, ModelRepository, TeamRepository, CheckEngine, PermissionCache],
})
export class AppModule {}
