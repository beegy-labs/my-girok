import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CountryConfigService } from './services/country-config.service';
import { CountryConfigController } from './controllers/country-config.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CountryConfigController],
  providers: [CountryConfigService],
  exports: [CountryConfigService],
})
export class CountryConfigModule {}
