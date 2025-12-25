import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PersonalInfoController } from './controllers/personal-info.controller';
import { PersonalInfoService } from './services/personal-info.service';

@Module({
  providers: [UsersService, PersonalInfoService],
  controllers: [UsersController, PersonalInfoController],
  exports: [UsersService, PersonalInfoService],
})
export class UsersModule {}
