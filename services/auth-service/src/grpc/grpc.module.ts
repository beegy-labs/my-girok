import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGrpcController } from './auth.grpc.controller';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { AdminSessionService } from '../admin/services/admin-session.service';
import { AdminMfaService } from '../admin/services/admin-mfa.service';
import { AdminPasswordService } from '../admin/services/admin-password.service';
import { OperatorAssignmentService } from '../admin/services/operator-assignment.service';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRATION', '1h');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthGrpcController],
  providers: [
    AdminSessionService,
    AdminMfaService,
    AdminPasswordService,
    OperatorAssignmentService,
  ],
})
export class GrpcModule {}
