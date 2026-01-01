import { IsUUID, IsEnum, IsOptional, IsString, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DsrRequestType {
  ACCESS = 'ACCESS',
  RECTIFICATION = 'RECTIFICATION',
  ERASURE = 'ERASURE',
  RESTRICTION = 'RESTRICTION',
  PORTABILITY = 'PORTABILITY',
  OBJECTION = 'OBJECTION',
}

export class CreateDsrRequestDto {
  @ApiProperty({ description: 'Account UUID' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({
    description: 'Type of DSR request',
    enum: DsrRequestType,
    example: DsrRequestType.ACCESS,
  })
  @IsEnum(DsrRequestType)
  requestType!: DsrRequestType;

  @ApiPropertyOptional({ description: 'Description of the request' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'IP address of the requester' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
