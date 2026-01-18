import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DelegationService } from './services/delegation.service';
import { DelegationController } from './controllers/delegation.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [DelegationController],
  providers: [DelegationService],
  exports: [DelegationService],
})
export class DelegationModule {}
