import { Module } from '@nestjs/common';
import { LawRegistryController } from './law-registry.controller';
import { LawRegistryService } from './law-registry.service';

@Module({
  controllers: [LawRegistryController],
  providers: [LawRegistryService],
  exports: [LawRegistryService],
})
export class LawRegistryModule {}
