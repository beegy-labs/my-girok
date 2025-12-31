import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
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

export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
  meta: PaginationMeta;

  constructor(data: T[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);

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
}
