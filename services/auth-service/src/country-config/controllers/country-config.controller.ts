import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@my-girok/nest-common';
import { CountryConfigService } from '../services/country-config.service';
import {
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  CountryConfigQueryDto,
  CountryConfigResponseDto,
} from '../dto/country-config.dto';

@ApiTags('Country Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('country-configs')
export class CountryConfigController {
  constructor(private readonly countryConfigService: CountryConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new country configuration' })
  create(@Body() dto: CreateCountryConfigDto): Promise<CountryConfigResponseDto> {
    return this.countryConfigService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all country configurations (with filters)' })
  findAll(
    @Query() query: CountryConfigQueryDto,
  ): Promise<{ data: CountryConfigResponseDto[]; total: number }> {
    return this.countryConfigService.findAll(query);
  }

  @Get('code/:countryCode')
  @ApiOperation({ summary: 'Get country configuration by country code' })
  findByCountryCode(@Param('countryCode') countryCode: string): Promise<CountryConfigResponseDto> {
    return this.countryConfigService.findByCountryCode(countryCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get country configuration by ID' })
  findById(@Param('id') id: string): Promise<CountryConfigResponseDto> {
    return this.countryConfigService.findById(id);
  }

  @Patch('code/:countryCode')
  @ApiOperation({ summary: 'Update country configuration by country code' })
  update(
    @Param('countryCode') countryCode: string,
    @Body() dto: UpdateCountryConfigDto,
  ): Promise<CountryConfigResponseDto> {
    return this.countryConfigService.update(countryCode, dto);
  }

  @Delete('code/:countryCode')
  @ApiOperation({ summary: 'Delete country configuration by country code' })
  delete(@Param('countryCode') countryCode: string): Promise<void> {
    return this.countryConfigService.delete(countryCode);
  }
}
