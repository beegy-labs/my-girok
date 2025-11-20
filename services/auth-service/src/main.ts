import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Auth Service Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  app.setGlobalPrefix('v1', {
    exclude: ['health'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Security Headers (SECURITY.md)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://rybbit.girok.dev'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS Policy (SECURITY.md) - Enhanced for iOS Safari compatibility
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? ['https://mygirok.dev', 'https://admin.mygirok.dev']
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://my-dev.girok.dev',
          ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 3600, // Cache preflight for 1 hour (iOS Safari compatibility)
    optionsSuccessStatus: 204, // Some legacy browsers (IE11) choke on 204
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
  SwaggerModule.setup('docs', app, document, {
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
  console.log(`API version: v1`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
