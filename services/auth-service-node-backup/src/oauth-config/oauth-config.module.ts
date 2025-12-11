import { Module } from '@nestjs/common';
import { OAuthConfigController } from './oauth-config.controller';
import { OAuthConfigService } from './oauth-config.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [OAuthConfigController],
  providers: [OAuthConfigService],
  exports: [OAuthConfigService],
})
export class OAuthConfigModule {}
