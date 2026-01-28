import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { SesModule } from '../ses/ses.module';
import { TemplateModule } from '../templates/template.module';
import { PrismaModule } from '../prisma';
import { AuditModule } from '../audit/audit.module';

/**
 * Kafka Module for mail-service
 * Provides Kafka producer and consumer for async email processing
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SesModule),
    TemplateModule,
    PrismaModule,
    forwardRef(() => AuditModule),
  ],
  providers: [KafkaProducerService, KafkaConsumerService],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
