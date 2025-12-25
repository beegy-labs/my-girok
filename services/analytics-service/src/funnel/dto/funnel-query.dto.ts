import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsArray, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FunnelQueryDto {
  @ApiProperty({ description: 'Funnel steps (event names in order)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  steps!: string[];

  @ApiProperty({ description: 'Start date for analysis' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date for analysis' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Max time between steps in seconds', default: 86400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(2592000) // 30 days
  conversionWindow?: number;

  @ApiPropertyOptional({ description: 'Group by user or session', default: 'user' })
  @IsOptional()
  @IsString()
  groupBy?: 'user' | 'session';
}

export class FunnelDefinitionDto {
  @ApiProperty({ description: 'Funnel name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Funnel description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Funnel steps', type: [String] })
  @IsArray()
  @IsString({ each: true })
  steps!: string[];

  @ApiPropertyOptional({ description: 'Conversion window in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  conversionWindow?: number;
}

export interface FunnelStepResult {
  step: string;
  stepNumber: number;
  entered: number;
  completed: number;
  dropoffRate: number;
  conversionRate: number;
  avgTimeToNext: number | null;
}

export interface FunnelResult {
  steps: FunnelStepResult[];
  overallConversionRate: number;
  totalEntered: number;
  totalCompleted: number;
  avgTimeToComplete: number | null;
}

export interface FunnelComparison {
  current: FunnelResult;
  previous: FunnelResult;
  conversionChange: number;
  stepChanges: {
    step: string;
    currentRate: number;
    previousRate: number;
    change: number;
  }[];
}
