import { PipeTransform, BadRequestException, Injectable } from '@nestjs/common';
import { UUIDv7 } from './uuidv7.generator';

/**
 * Validation pipe for UUID parameters (supports all UUID versions 1-8)
 *
 * @example
 * @Get(':id')
 * async getById(@Param('id', ParseUUIDPipe) id: string) {
 *   // id is validated UUID
 * }
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!UUIDv7.isValidUUID(value)) {
      throw new BadRequestException(`Invalid UUID format: ${value}`);
    }
    return value;
  }
}

/**
 * Validation pipe for UUIDv7 specifically
 *
 * @example
 * @Get(':id')
 * async getById(@Param('id', ParseUUIDv7Pipe) id: string) {
 *   // id is validated UUIDv7
 * }
 */
@Injectable()
export class ParseUUIDv7Pipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!UUIDv7.isValid(value)) {
      throw new BadRequestException(`Invalid UUIDv7 format: ${value}`);
    }
    return value;
  }
}

// Backward compatibility alias
export { ParseUUIDPipe as UUIDValidationPipe };
export { ParseUUIDPipe as IdValidationPipe };
