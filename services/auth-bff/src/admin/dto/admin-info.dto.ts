import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminInfoDto {
  @ApiProperty({ description: 'Admin ID' })
  id!: string;

  @ApiProperty({ description: 'Admin email' })
  email!: string;

  @ApiProperty({ description: 'Admin display name' })
  name!: string;

  @ApiProperty({ description: 'Admin scope', enum: ['SYSTEM', 'TENANT'] })
  scope!: string;

  @ApiProperty({ description: 'Whether MFA is enabled' })
  mfaEnabled!: boolean;

  @ApiPropertyOptional({ description: 'Role name' })
  roleName?: string;

  @ApiPropertyOptional({ description: 'Permissions' })
  permissions?: string[];
}
