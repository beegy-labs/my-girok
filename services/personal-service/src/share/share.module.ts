import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { PrismaService } from '../database/prisma.service';
import { ResumeModule } from '../resume/resume.module';

@Module({
  imports: [ResumeModule],
  controllers: [ShareController],
  providers: [ShareService, PrismaService],
  exports: [ShareService],
})
export class ShareModule {}
