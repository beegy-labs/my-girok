import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SesService } from './ses.service';

/**
 * SES Module
 * Provides AWS SES integration for email sending
 */
@Module({
  imports: [ConfigModule],
  providers: [SesService],
  exports: [SesService],
})
export class SesModule {}
