import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AttestationService } from './services/attestation.service';
import { CertificationService } from './services/certification.service';
import { TrainingService } from './services/training.service';
import { ComplianceController } from './controllers/compliance.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ComplianceController],
  providers: [AttestationService, CertificationService, TrainingService],
  exports: [AttestationService, CertificationService, TrainingService],
})
export class ComplianceModule {}
