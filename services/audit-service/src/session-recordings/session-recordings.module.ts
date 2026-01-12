import { Module } from '@nestjs/common';
import { SessionRecordingGrpcController } from './controllers/session-recording.grpc.controller';
import { SessionRecordingService } from './services/session-recording.service';

@Module({
  controllers: [SessionRecordingGrpcController],
  providers: [SessionRecordingService],
  exports: [SessionRecordingService],
})
export class SessionRecordingsModule {}
