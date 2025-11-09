import { IsEmail, IsString, MinLength, Matches, MaxLength } from 'class-validator';
import { RegisterDto as IRegisterDto } from '@my-girok/types';

export class RegisterDto implements IRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Username must contain only lowercase letters, numbers, hyphens, and underscores',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}
