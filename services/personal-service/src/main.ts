import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Personal Service Bootstrap
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

  // Security Headers
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

  // CORS Policy - Enhanced for iOS Safari compatibility
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
    .setTitle('My-Girok Personal Service API')
    .setDescription('Personal data management microservice (Resume, Budget, Share)')
    .setVersion('1.0.0')
    .addTag('resume', 'Resume management endpoints')
    .addTag('share', 'Share link management endpoints')
    .addTag('health', 'Health check endpoint')
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
    customSiteTitle: 'My-Girok Personal API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = configService.get('PORT', 4002);
  await app.listen(port);

  console.log(`Personal service is running on: http://localhost:${port}`);
  console.log(`API version: v1`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
