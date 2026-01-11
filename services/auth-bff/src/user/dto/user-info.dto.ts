import { ApiProperty } from '@nestjs/swagger';

export class UserInfoDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ description: 'Username' })
  username!: string;

  @ApiProperty({ description: 'Whether email is verified' })
  emailVerified!: boolean;

  @ApiProperty({ description: 'Whether MFA is enabled' })
  mfaEnabled!: boolean;
}
