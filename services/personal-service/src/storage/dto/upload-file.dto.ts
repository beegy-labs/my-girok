import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AttachmentType {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  PORTFOLIO = 'PORTFOLIO',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

export class UploadFileDto {
  @ApiProperty({
    enum: AttachmentType,
    description: 'Type of attachment',
    example: AttachmentType.PROFILE_PHOTO,
  })
  @IsEnum(AttachmentType)
  type!: AttachmentType;

  @ApiProperty({
    description: 'Title for the file (optional)',
    example: 'Portfolio 2024',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Description for the file (optional)',
    example: 'My latest web development projects',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
