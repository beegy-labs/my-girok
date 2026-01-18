import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@my-girok/nest-common';
import { AttestationService } from '../services/attestation.service';
import { CertificationService } from '../services/certification.service';
import { TrainingService } from '../services/training.service';
import {
  CreateAttestationDto,
  UpdateAttestationDto,
  CompleteAttestationDto,
  WaiveAttestationDto,
  AttestationQueryDto,
  AttestationResponseDto,
} from '../dto/attestation.dto';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
  VerifyCertificationDto,
  CertificationQueryDto,
  CertificationResponseDto,
} from '../dto/certification.dto';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  CompleteTrainingDto,
  WaiveTrainingDto,
  TrainingQueryDto,
  TrainingResponseDto,
} from '../dto/training.dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly attestationService: AttestationService,
    private readonly certificationService: CertificationService,
    private readonly trainingService: TrainingService,
  ) {}

  // Attestation endpoints
  @Post('attestations')
  @ApiOperation({ summary: 'Create a new attestation' })
  createAttestation(@Body() dto: CreateAttestationDto): Promise<AttestationResponseDto> {
    return this.attestationService.create(dto);
  }

  @Get('attestations')
  @ApiOperation({ summary: 'List all attestations (with filters)' })
  findAllAttestations(
    @Query() query: AttestationQueryDto,
  ): Promise<{ data: AttestationResponseDto[]; total: number }> {
    return this.attestationService.findAll(query);
  }

  @Get('attestations/:id')
  @ApiOperation({ summary: 'Get attestation by ID' })
  findAttestationById(@Param('id') id: string): Promise<AttestationResponseDto> {
    return this.attestationService.findById(id);
  }

  @Patch('attestations/:id')
  @ApiOperation({ summary: 'Update attestation' })
  updateAttestation(
    @Param('id') id: string,
    @Body() dto: UpdateAttestationDto,
  ): Promise<AttestationResponseDto> {
    return this.attestationService.update(id, dto);
  }

  @Post('attestations/:id/complete')
  @ApiOperation({ summary: 'Complete attestation' })
  completeAttestation(
    @Param('id') id: string,
    @Body() dto: CompleteAttestationDto,
  ): Promise<AttestationResponseDto> {
    return this.attestationService.complete(id, dto);
  }

  @Post('attestations/:id/waive')
  @ApiOperation({ summary: 'Waive attestation' })
  waiveAttestation(
    @Param('id') id: string,
    @Body() dto: WaiveAttestationDto,
  ): Promise<AttestationResponseDto> {
    return this.attestationService.waive(id, dto);
  }

  @Delete('attestations/:id')
  @ApiOperation({ summary: 'Delete attestation' })
  deleteAttestation(@Param('id') id: string): Promise<void> {
    return this.attestationService.delete(id);
  }

  // Certification endpoints
  @Post('certifications')
  @ApiOperation({ summary: 'Create a new certification' })
  createCertification(@Body() dto: CreateCertificationDto): Promise<CertificationResponseDto> {
    return this.certificationService.create(dto);
  }

  @Get('certifications')
  @ApiOperation({ summary: 'List all certifications (with filters)' })
  findAllCertifications(
    @Query() query: CertificationQueryDto,
  ): Promise<{ data: CertificationResponseDto[]; total: number }> {
    return this.certificationService.findAll(query);
  }

  @Get('certifications/:id')
  @ApiOperation({ summary: 'Get certification by ID' })
  findCertificationById(@Param('id') id: string): Promise<CertificationResponseDto> {
    return this.certificationService.findById(id);
  }

  @Patch('certifications/:id')
  @ApiOperation({ summary: 'Update certification' })
  updateCertification(
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
  ): Promise<CertificationResponseDto> {
    return this.certificationService.update(id, dto);
  }

  @Post('certifications/:id/verify')
  @ApiOperation({ summary: 'Verify certification' })
  verifyCertification(
    @Param('id') id: string,
    @Body() dto: VerifyCertificationDto,
  ): Promise<CertificationResponseDto> {
    return this.certificationService.verify(id, dto);
  }

  @Delete('certifications/:id')
  @ApiOperation({ summary: 'Delete certification' })
  deleteCertification(@Param('id') id: string): Promise<void> {
    return this.certificationService.delete(id);
  }

  // Training endpoints
  @Post('trainings')
  @ApiOperation({ summary: 'Create a new training record' })
  createTraining(@Body() dto: CreateTrainingDto): Promise<TrainingResponseDto> {
    return this.trainingService.create(dto);
  }

  @Get('trainings')
  @ApiOperation({ summary: 'List all training records (with filters)' })
  findAllTrainings(
    @Query() query: TrainingQueryDto,
  ): Promise<{ data: TrainingResponseDto[]; total: number }> {
    return this.trainingService.findAll(query);
  }

  @Get('trainings/:id')
  @ApiOperation({ summary: 'Get training record by ID' })
  findTrainingById(@Param('id') id: string): Promise<TrainingResponseDto> {
    return this.trainingService.findById(id);
  }

  @Patch('trainings/:id')
  @ApiOperation({ summary: 'Update training record' })
  updateTraining(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingDto,
  ): Promise<TrainingResponseDto> {
    return this.trainingService.update(id, dto);
  }

  @Post('trainings/:id/start')
  @ApiOperation({ summary: 'Start training' })
  startTraining(@Param('id') id: string): Promise<TrainingResponseDto> {
    return this.trainingService.start(id);
  }

  @Post('trainings/:id/complete')
  @ApiOperation({ summary: 'Complete training' })
  completeTraining(
    @Param('id') id: string,
    @Body() dto: CompleteTrainingDto,
  ): Promise<TrainingResponseDto> {
    return this.trainingService.complete(id, dto);
  }

  @Post('trainings/:id/waive')
  @ApiOperation({ summary: 'Waive training' })
  waiveTraining(
    @Param('id') id: string,
    @Body() dto: WaiveTrainingDto,
  ): Promise<TrainingResponseDto> {
    return this.trainingService.waive(id, dto);
  }

  @Delete('trainings/:id')
  @ApiOperation({ summary: 'Delete training record' })
  deleteTraining(@Param('id') id: string): Promise<void> {
    return this.trainingService.delete(id);
  }
}
