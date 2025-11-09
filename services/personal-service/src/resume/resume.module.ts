import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [ResumeController],
  providers: [ResumeService, PrismaService],
  exports: [ResumeService],
})
export class ResumeModule {}
