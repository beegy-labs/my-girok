import { IsString, MinLength } from 'class-validator';
import { ChangePasswordDto as IChangePasswordDto } from '@my-girok/types';

export class ChangePasswordDto implements IChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword!: string;
}
