import { NestFactory } from '@nestjs/core';
import { configureApp } from '@my-girok/nest-common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureApp(app, {
    serviceName: 'My-Girok Auth Service',
    description: 'Authentication and Authorization microservice',
    defaultPort: 4001,
    swaggerTags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'oauth-config', description: 'OAuth provider configuration (MASTER only)' },
      { name: 'users', description: 'User management' },
      { name: 'health', description: 'Health check endpoints' },
    ],
  });
}

bootstrap();
