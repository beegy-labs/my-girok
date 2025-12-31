import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database';
import { CommonModule } from './common/common.module';
import { MessagingModule } from './common/messaging/messaging.module';
import { SagaModule } from './common/saga/saga.module';
import { IdentityModule } from './identity/identity.module';
import { AuthModule } from './auth/auth.module';
import { LegalModule } from './legal/legal.module';
import { CompositionModule } from './composition/composition.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    CommonModule,
    MessagingModule,
    SagaModule,
    IdentityModule,
    AuthModule,
    LegalModule,
    CompositionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
