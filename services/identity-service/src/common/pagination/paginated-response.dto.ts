import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination meta interface for type safety
 * SSOT: All paginated responses should use this structure
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

/**
 * Generic paginated response interface
 * Use this for type annotations in services
 */
export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}

export class PaginationMeta implements IPaginationMeta {
  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage!: boolean;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage!: boolean;
}

export class PaginatedResponse<T> implements IPaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
  meta: PaginationMeta;

  constructor(data: T[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit) || 0;

    this.data = data;
    this.meta = {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Create a paginated response from query results
   * SSOT: Use this factory method for consistent pagination
   */
  static create<T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 20,
  ): PaginatedResponse<T> {
    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * Create an empty paginated response
   */
  static empty<T>(page: number = 1, limit: number = 20): PaginatedResponse<T> {
    return new PaginatedResponse<T>([], 0, page, limit);
  }

  /**
   * Create from existing meta (for legacy compatibility)
   * Ensures totalPages is always present
   */
  static fromMeta<T>(
    data: T[],
    meta: { total: number; page: number; limit: number; totalPages?: number },
  ): PaginatedResponse<T> {
    return new PaginatedResponse(data, meta.total, meta.page, meta.limit);
  }
}
