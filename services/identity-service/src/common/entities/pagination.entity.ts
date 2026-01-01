import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata for list responses
 */
export class PaginationMeta {
  @ApiProperty({
    description: 'Total number of items',
    type: Number,
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    type: Number,
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    type: Number,
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    type: Number,
    example: 5,
  })
  totalPages!: number;
}
