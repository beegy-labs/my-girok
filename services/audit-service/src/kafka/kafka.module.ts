import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
                clientId: 'audit-service',
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
              consumer: {
                groupId: 'audit-service-admin-events',
                allowAutoTopicCreation: false,
                sessionTimeout: 30000,
                heartbeatInterval: 3000,
                rebalanceTimeout: 60000,
                retry: {
                  initialRetryTime: 100,
                  retries: 8,
                  maxRetryTime: 30000,
                  multiplier: 2,
                },
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
