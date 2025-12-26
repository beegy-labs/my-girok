import { PipeTransform, BadRequestException, Injectable } from '@nestjs/common';
import { ID } from './ulid.generator';

/**
 * Validation pipe for ULID parameters
 *
 * @example
 * @Get(':id')
 * async getById(@Param('id', ParseUlidPipe) id: string) {
 *   // id is validated ULID
 * }
 */
@Injectable()
export class ParseUlidPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!ID.isValid(value)) {
      throw new BadRequestException('Invalid ULID format');
    }
    return value;
  }
}
