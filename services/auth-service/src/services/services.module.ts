import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Services Module for user service join and consent management
 * Issue: #356
 */
@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
