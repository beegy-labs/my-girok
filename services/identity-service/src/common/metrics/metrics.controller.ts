import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus-formatted metrics',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example:
            '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 100',
        },
      },
    },
  })
  getMetrics(): string {
    return this.metricsService.getMetrics();
  }
}
