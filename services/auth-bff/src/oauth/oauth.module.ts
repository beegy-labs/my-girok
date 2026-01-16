import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OAuthController } from './oauth.controller';

@Module({
  imports: [HttpModule],
  controllers: [OAuthController],
})
export class OAuthModule {}
