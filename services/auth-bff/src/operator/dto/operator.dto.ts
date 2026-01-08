import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class OperatorLoginDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: 'Service ID to operate on' })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ description: 'Country code for regional scoping' })
  @IsString()
  @IsNotEmpty()
  countryCode!: string;
}

export class OperatorInfoDto {
  @ApiProperty({ description: 'Operator assignment ID' })
  id!: string;

  @ApiProperty({ description: 'User account ID' })
  accountId!: string;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ description: 'Service ID' })
  serviceId!: string;

  @ApiProperty({ description: 'Country code' })
  countryCode!: string;

  @ApiPropertyOptional({ description: 'Permissions' })
  permissions?: string[];
}

export class OperatorLoginResponseDto {
  @ApiProperty({ description: 'Whether login was successful' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Whether MFA is required' })
  mfaRequired?: boolean;

  @ApiPropertyOptional({ description: 'Challenge ID for MFA step' })
  challengeId?: string;

  @ApiPropertyOptional({ description: 'Operator info if login complete' })
  operator?: OperatorInfoDto;

  @ApiProperty({ description: 'Response message' })
  message!: string;
}
