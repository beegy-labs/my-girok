import { IsString } from 'class-validator';
import { RefreshTokenDto as IRefreshTokenDto } from '@my-girok/types';

export class RefreshTokenDto implements IRefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
