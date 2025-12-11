import { IsString, IsNumber, Min, Max, IsOptional, IsEmail } from 'class-validator';
import { GrantDomainAccessDto as IGrantDomainAccessDto } from '@my-girok/types';

export class GrantDomainAccessDto implements IGrantDomainAccessDto {
  @IsString()
  domain!: string;

  @IsNumber()
  @Min(1)
  @Max(72)
  expiresInHours!: number;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;
}
