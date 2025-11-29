import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '@my-girok/types';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      authorizationURL: 'https://kauth.kakao.com/oauth/authorize',
      tokenURL: 'https://kauth.kakao.com/oauth/token',
      clientID: configService.get('KAKAO_CLIENT_ID')!,
      clientSecret: configService.get('KAKAO_CLIENT_SECRET')!,
      callbackURL: configService.get('KAKAO_CALLBACK_URL')!,
      scope: ['profile_nickname', 'profile_image', 'account_email'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _profile: any,
  ): Promise<any> {
    // Fetch user profile from Kakao API
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json() as { id: string; kakao_account: { email: string; profile?: { nickname: string; profile_image_url: string } } };
    const { id, kakao_account } = data;

    const user = await this.authService.findOrCreateOAuthUser(
      kakao_account.email,
      AuthProvider.KAKAO,
      id.toString(),
      kakao_account.profile?.nickname,
      kakao_account.profile?.profile_image_url,
    );

    return user;
  }
}
