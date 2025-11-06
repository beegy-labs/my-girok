import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get('API_PREFIX', 'api/v1'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('My-Girok Auth Service API')
    .setDescription('Authentication and Authorization microservice')
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('oauth-config', 'OAuth provider configuration (MASTER only)')
    .addTag('users', 'User management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'My-Girok Auth API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = configService.get('PORT', 4001);
  await app.listen(port);

  console.log(`Auth service is running on: http://localhost:${port}`);
  console.log(`API prefix: ${configService.get('API_PREFIX', 'api/v1')}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
