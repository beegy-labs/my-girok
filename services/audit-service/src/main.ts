// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'audit-service' });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from '@my-girok/nest-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'Audit Service',
    description: 'Audit and compliance service for legal requirements',
    defaultPort: 4002,
  });
}
bootstrap();
