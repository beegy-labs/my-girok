import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { PrismaService } from '../database/prisma.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [HttpModule, StorageModule],
  controllers: [ResumeController],
  providers: [ResumeService, PrismaService],
  exports: [ResumeService],
})
export class ResumeModule {}
