import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [ResumeController],
  providers: [ResumeService, PrismaService],
  exports: [ResumeService],
})
export class ResumeModule {}
