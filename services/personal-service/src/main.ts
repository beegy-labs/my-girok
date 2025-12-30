// CRITICAL: OTEL must be initialized FIRST before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'personal-service' });

import { NestFactory } from '@nestjs/core';
import { configureApp } from '@my-girok/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'My-Girok Personal Service',
    description: 'Personal data management microservice (Resume, Budget, Share)',
    defaultPort: 4004,
    swaggerTags: [
      { name: 'resume', description: 'Resume management endpoints' },
      { name: 'share', description: 'Share link management endpoints' },
      { name: 'user-preferences', description: 'User preferences endpoints' },
      { name: 'health', description: 'Health check endpoints' },
    ],
  });
}

bootstrap();
