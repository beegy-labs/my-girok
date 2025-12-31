import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // TODO: Add modules
    // IdentityModule,
    // AuthModule,
    // LegalModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
