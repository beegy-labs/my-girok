// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'analytics-service' });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from '@my-girok/nest-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'Analytics Service',
    description: 'Business analytics and event tracking service',
    defaultPort: 4003,
  });
}
bootstrap();
