import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '@my-girok/types';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      authorizationURL: 'https://nid.naver.com/oauth2.0/authorize',
      tokenURL: 'https://nid.naver.com/oauth2.0/token',
      clientID: configService.get('NAVER_CLIENT_ID')!,
      clientSecret: configService.get('NAVER_CLIENT_SECRET')!,
      callbackURL: configService.get('NAVER_CALLBACK_URL')!,
      scope: ['email', 'nickname', 'profile_image'],
    });
  }

  async validate(accessToken: string, _refreshToken: string, _profile: any): Promise<any> {
    // Fetch user profile from Naver API
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as {
      response: { id: string; email: string; nickname: string; profile_image: string };
    };
    const { id, email, nickname, profile_image } = data.response;

    const user = await this.authService.findOrCreateOAuthUser(
      email,
      AuthProvider.NAVER,
      id,
      nickname,
      profile_image,
    );

    return user;
  }
}
