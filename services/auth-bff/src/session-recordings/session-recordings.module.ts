import { Module } from '@nestjs/common';
import { SessionRecordingsController } from './session-recordings.controller';

@Module({
  controllers: [SessionRecordingsController],
})
export class SessionRecordingsModule {}
