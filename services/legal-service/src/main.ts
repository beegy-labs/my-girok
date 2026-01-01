import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // CORS
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('legal/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Legal Service API')
      .setDescription('Legal and compliance microservice - Consents, DSR, Law Registry')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('consents', 'User consent management (GDPR)')
      .addTag('dsr', 'Data Subject Rights requests')
      .addTag('law-registry', 'Law and regulation registry')
      .addTag('legal-documents', 'Legal documents management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('legal/docs', app, document);
  }

  const port = process.env.PORT || 3006;
  await app.listen(port);

  logger.log(`Legal Service is running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/legal/docs`);
}

bootstrap();
