import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@my-girok/types';

/**
 * Response DTO for OAuth provider configuration
 * Secrets are masked for security (only last 4 characters shown)
 */
export class OAuthProviderResponseDto {
  @ApiProperty({
    description: 'OAuth provider type',
    enum: AuthProvider,
    example: AuthProvider.GOOGLE,
  })
  provider!: AuthProvider;

  @ApiProperty({
    description: 'Whether the provider is enabled',
    example: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'OAuth client ID',
    example: '123456789-abcdefg.apps.googleusercontent.com',
    required: false,
  })
  clientId?: string;

  @ApiProperty({
    description: 'Masked OAuth client secret (shows last 4 characters)',
    example: '********fg78',
    required: false,
  })
  clientSecretMasked?: string;

  @ApiProperty({
    description: 'OAuth callback URL',
    example: 'https://auth-bff.girok.dev/v1/oauth/google/callback',
    required: false,
  })
  callbackUrl?: string;

  @ApiProperty({
    description: 'Display name for the provider',
    example: 'Google',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Description of the provider',
    example: 'Login with Google',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-16T12:00:00Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'ID of admin who last updated the config',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  updatedBy?: string;
}
