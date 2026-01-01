import { Module } from '@nestjs/common';
import { LawRegistryController } from './law-registry.controller';
import { LawRegistryService } from './law-registry.service';

/**
 * Law Registry Module
 *
 * Handles country-specific legal requirements including:
 * - Law CRUD operations
 * - Consent requirements lookup
 * - Default law seeding
 */
@Module({
  controllers: [LawRegistryController],
  providers: [LawRegistryService],
  exports: [LawRegistryService],
})
export class LawRegistryModule {}
