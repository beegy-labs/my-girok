import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { RegisterDto as IRegisterDto } from '@my-girok/types';

export class RegisterDto implements IRegisterDto {
  @IsEmail()
  email!: string;

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
