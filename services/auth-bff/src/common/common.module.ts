import { Module, Global } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';

@Global()
@Module({
  providers: [SessionGuard],
  exports: [SessionGuard],
})
export class CommonModule {}
