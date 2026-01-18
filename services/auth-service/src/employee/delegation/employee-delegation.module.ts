import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmployeeDelegationController } from './employee-delegation.controller';
import { EmployeeDelegationService } from './employee-delegation.service';
import { DelegationModule } from '../../delegation/delegation.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    DelegationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [EmployeeDelegationController],
  providers: [EmployeeDelegationService],
  exports: [EmployeeDelegationService],
})
export class EmployeeDelegationModule {}
