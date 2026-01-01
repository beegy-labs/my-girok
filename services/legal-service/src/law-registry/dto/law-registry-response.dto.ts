import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LawRegistryResponseDto {
  @ApiProperty({ description: 'Law registry UUID' })
  id!: string;

  @ApiProperty({ description: 'Law code' })
  code!: string;

  @ApiProperty({ description: 'Law name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiProperty({ description: 'Country code' })
  countryCode!: string;

  @ApiProperty({ description: 'Effective date' })
  effectiveDate!: Date;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}
