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
import { JwtAuthGuard, AdminId } from '@my-girok/nest-common';
import { DelegationService } from '../services/delegation.service';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  ApproveDelegationDto,
  RevokeDelegationDto,
  DelegationQueryDto,
  DelegationResponseDto,
  DelegationLogResponseDto,
} from '../dto/delegation.dto';

@ApiTags('Delegations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('delegations')
export class DelegationController {
  constructor(private readonly delegationService: DelegationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delegation' })
  create(@Body() dto: CreateDelegationDto): Promise<DelegationResponseDto> {
    return this.delegationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all delegations (with filters)' })
  findAll(
    @Query() query: DelegationQueryDto,
  ): Promise<{ data: DelegationResponseDto[]; total: number }> {
    return this.delegationService.findAll(query);
  }

  @Get('me/delegated')
  @ApiOperation({ summary: 'Get delegations I delegated to others' })
  getMyDelegated(
    @AdminId() adminId: string,
    @Query() query: DelegationQueryDto,
  ): Promise<{ data: DelegationResponseDto[]; total: number }> {
    return this.delegationService.findAll({ ...query, delegatorId: adminId });
  }

  @Get('me/received')
  @ApiOperation({ summary: 'Get delegations I received from others' })
  getMyReceived(
    @AdminId() adminId: string,
    @Query() query: DelegationQueryDto,
  ): Promise<{ data: DelegationResponseDto[]; total: number }> {
    return this.delegationService.findAll({ ...query, delegateId: adminId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delegation by ID' })
  findById(@Param('id') id: string): Promise<DelegationResponseDto> {
    return this.delegationService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delegation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDelegationDto,
  ): Promise<DelegationResponseDto> {
    return this.delegationService.update(id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve or reject delegation' })
  approve(
    @Param('id') id: string,
    @AdminId() approverId: string,
    @Body() dto: ApproveDelegationDto,
  ): Promise<DelegationResponseDto> {
    return this.delegationService.approve(id, approverId, dto);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke delegation' })
  revoke(
    @Param('id') id: string,
    @AdminId() revokerId: string,
    @Body() dto: RevokeDelegationDto,
  ): Promise<DelegationResponseDto> {
    return this.delegationService.revoke(id, revokerId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delegation (only if not active)' })
  delete(@Param('id') id: string, @AdminId() adminId: string): Promise<void> {
    return this.delegationService.delete(id, adminId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get delegation usage logs' })
  getLogs(@Param('id') id: string): Promise<{ data: DelegationLogResponseDto[]; total: number }> {
    return this.delegationService.getLogs(id);
  }
}
