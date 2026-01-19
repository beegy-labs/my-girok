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
          const kafkaConfig = configService.get('kafka');
          const { brokers, clientId, consumerGroup, sasl, consumer } = kafkaConfig;

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId,
                brokers,
                ...(sasl.username &&
                  sasl.password && {
                    sasl: {
                      mechanism: 'plain' as const,
                      username: sasl.username,
                      password: sasl.password,
                    },
                    ssl: true,
                  }),
              },
              consumer: {
                groupId: consumerGroup,
                allowAutoTopicCreation: false,
                sessionTimeout: consumer.sessionTimeout,
                heartbeatInterval: consumer.heartbeatInterval,
                rebalanceTimeout: consumer.rebalanceTimeout,
                retry: {
                  initialRetryTime: consumer.retry.initialRetryTime,
                  retries: consumer.retry.retries,
                  maxRetryTime: consumer.retry.maxRetryTime,
                  multiplier: consumer.retry.multiplier,
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
