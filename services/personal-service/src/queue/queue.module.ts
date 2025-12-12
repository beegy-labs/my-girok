import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { QUEUE_NAMES } from './queue.constants';
import { FileCopyProcessor } from './processors/file-copy.processor';
import { FileCopyService } from './services/file-copy.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('VALKEY_HOST', 'localhost'),
          port: config.get<number>('VALKEY_PORT', 6379),
          password: config.get<string>('VALKEY_PASSWORD'),
          db: config.get<number>('VALKEY_DB', 1),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600, // 1 hour
            count: 1000,
          },
          removeOnFail: {
            age: 86400, // 24 hours
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.FILE_COPY,
    }),
    StorageModule,
  ],
  providers: [FileCopyProcessor, FileCopyService, PrismaService],
  exports: [FileCopyService],
})
export class QueueModule {}
