import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PersonalInfoController } from './controllers/personal-info.controller';
import { PersonalInfoService } from './services/personal-info.service';
import { AccountLinkController } from './controllers/account-link.controller';
import { AccountLinkingService } from './services/account-linking.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [UsersService, PersonalInfoService, AccountLinkingService],
  controllers: [UsersController, PersonalInfoController, AccountLinkController],
  exports: [UsersService, PersonalInfoService, AccountLinkingService],
})
export class UsersModule {}
