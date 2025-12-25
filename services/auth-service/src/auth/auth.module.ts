import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  JwtStrategy,
  LocalStrategy,
  // Temporarily disabled until OAuth credentials are configured
  // GoogleStrategy,
  // KakaoStrategy,
  // NaverStrategy,
} from './strategies';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '1h'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    // Temporarily disabled until OAuth credentials are configured
    // GoogleStrategy,
    // KakaoStrategy,
    // NaverStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
