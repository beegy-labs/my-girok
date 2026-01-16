import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '@my-girok/types';

/**
 * Individual enabled provider info (public endpoint)
 */
export class EnabledProviderDto {
  @ApiProperty({
    description: 'OAuth provider type',
    enum: AuthProvider,
    example: AuthProvider.GOOGLE,
  })
  provider!: AuthProvider;

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
}

/**
 * Response DTO for enabled OAuth providers (public endpoint)
 * Does not include any credentials or sensitive data
 */
export class EnabledProvidersResponseDto {
  @ApiProperty({
    description: 'List of enabled OAuth providers',
    type: [EnabledProviderDto],
  })
  providers!: EnabledProviderDto[];
}
