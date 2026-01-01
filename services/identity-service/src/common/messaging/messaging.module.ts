import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxModule } from '../outbox/outbox.module';
import { DatabaseModule } from '../../database/database.module';

/**
 * Messaging Module
 * Provides Kafka/Redpanda integration with Transactional Outbox pattern
 *
 * Features:
 * - KafkaProducerService: Publish events to Kafka topics
 * - KafkaConsumerService: Subscribe and consume events from Kafka topics
 * - OutboxProcessorService: Poll outbox tables and publish to Kafka
 */
@Global()
@Module({
  imports: [ScheduleModule.forRoot(), OutboxModule, DatabaseModule],
  providers: [KafkaProducerService, KafkaConsumerService, OutboxProcessorService],
  exports: [KafkaProducerService, KafkaConsumerService, OutboxProcessorService],
})
export class MessagingModule {}
