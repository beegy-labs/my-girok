import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating OAuth provider credentials
 * All fields are optional - only provided fields will be updated
 */
export class UpdateCredentialsDto {
  @ApiProperty({
    description: 'OAuth client ID from provider console',
    example: '123456789-abcdefg.apps.googleusercontent.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: 'OAuth client secret from provider console (will be encrypted)',
    example: 'GOCSPX-abcd1234efgh5678',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiProperty({
    description: 'OAuth callback URL (must be in allowed domains)',
    example: 'https://auth-bff.girok.dev/v1/oauth/google/callback',
    required: false,
  })
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  callbackUrl?: string;
}
