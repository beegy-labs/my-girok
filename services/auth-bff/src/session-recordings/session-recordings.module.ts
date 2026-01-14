import { Module } from '@nestjs/common';
import { SessionRecordingsController } from './session-recordings.controller';
import { ShareLinkService } from './share-link.service';
import { SessionRecordingsGateway } from './websocket/session-recordings.gateway';

@Module({
  controllers: [SessionRecordingsController],
  providers: [ShareLinkService, SessionRecordingsGateway],
})
export class SessionRecordingsModule {}
