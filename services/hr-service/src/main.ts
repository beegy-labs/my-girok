/**
 * HR Service - Main Entry Point
 *
 * STATUS: Structure Backup Only (Not Implemented)
 *
 * This file is a placeholder for future implementation.
 * Do not run this service until migration is complete.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.error('HR Service is not implemented yet. This is a structure backup only.');
  process.exit(1);

  // Future implementation:
  // const app = await NestFactory.create(AppModule);
  // await app.listen(3006);
}

bootstrap();
