import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * Get the skip value for Prisma pagination
   */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }

  /**
   * Get the take value for Prisma pagination
   */
  get take(): number {
    return this.limit ?? 20;
  }

  /**
   * Get Prisma orderBy object
   */
  getOrderBy(defaultField: string = 'createdAt'): Record<string, 'asc' | 'desc'> {
    return {
      [this.sortBy ?? defaultField]: this.sortOrder ?? 'desc',
    };
  }
}
