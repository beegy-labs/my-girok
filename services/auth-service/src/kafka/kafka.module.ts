import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Kafka Module for event-driven architecture
 * Provides Kafka producer client for publishing domain events
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const brokers = configService.get<string>('REDPANDA_BROKERS', 'localhost:9092');
          const saslUsername = configService.get<string>('REDPANDA_SASL_USERNAME');
          const saslPassword = configService.get<string>('REDPANDA_SASL_PASSWORD');

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'auth-service',
                brokers: brokers.split(','),
                ...(saslUsername &&
                  saslPassword && {
                    sasl: {
                      mechanism: 'plain' as const,
                      username: saslUsername,
                      password: saslPassword,
                    },
                    ssl: true,
                  }),
              },
              producer: {
                allowAutoTopicCreation: true,
                compression: 1, // GZIP
                idempotent: true,
                maxInFlightRequests: 5,
                retry: {
                  retries: 3,
                  initialRetryTime: 100,
                  maxRetryTime: 30000,
                },
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
