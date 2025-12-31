import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = configService.get<string[]>('cors.origins');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`Identity Service running on port ${port}`);
}
bootstrap();
