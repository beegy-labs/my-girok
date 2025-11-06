import { IsEmail, IsString } from 'class-validator';
import { LoginDto as ILoginDto } from '@my-girok/types';

export class LoginDto implements ILoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
