import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, IsIn, Matches, MaxLength } from 'class-validator';

/**
 * Common sortable fields whitelist
 * Used to prevent SQL/NoSQL injection via ORDER BY clause
 */
export const ALLOWED_SORT_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'status',
  'type',
  'level',
  'displayName',
  'expiresAt',
  'startAt',
  'endAt',
  'lastLoginAt',
  'lastActiveAt',
] as const;

export type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];

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
    description: 'Field to sort by (must be alphanumeric/camelCase, max 50 chars)',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, {
    message: 'sortBy must be alphanumeric and start with a letter',
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
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
   * Get Prisma orderBy object with whitelist validation
   * @param defaultField - Default field to sort by
   * @param allowedFields - Whitelist of allowed sort fields (defaults to ALLOWED_SORT_FIELDS)
   * @throws Error if sortBy is not in allowedFields
   */
  getOrderBy(
    defaultField: string = 'createdAt',
    allowedFields: readonly string[] = ALLOWED_SORT_FIELDS,
  ): Record<string, 'asc' | 'desc'> {
    const field = this.sortBy ?? defaultField;

    // Validate against whitelist to prevent injection
    if (!allowedFields.includes(field)) {
      // Fall back to default field if invalid
      return {
        [defaultField]: this.sortOrder ?? 'desc',
      };
    }

    return {
      [field]: this.sortOrder ?? 'desc',
    };
  }

  /**
   * Get validated sortBy field or default
   * Returns the sortBy value only if it's in the allowed whitelist
   */
  getValidatedSortBy(
    defaultField: string = 'createdAt',
    allowedFields: readonly string[] = ALLOWED_SORT_FIELDS,
  ): string {
    if (this.sortBy && allowedFields.includes(this.sortBy)) {
      return this.sortBy;
    }
    return defaultField;
  }
}
