# Authentication Patterns - 2026 Best Practices

> JWT, OAuth2, session management, security | **Researched**: 2026-01-22

## Authentication Methods Comparison

| Method        | Use Case           | Stateless | Security Level |
| ------------- | ------------------ | --------- | -------------- |
| Session-based | Web apps, SSR      | No        | High           |
| JWT           | APIs, SPAs, Mobile | Yes       | Medium-High    |
| OAuth2        | Third-party login  | Depends   | High           |
| API Keys      | Service-to-service | Yes       | Low-Medium     |

## JWT Authentication

### Token Structure

```typescript
interface JwtPayload {
  sub: string; // Subject (user ID)
  iss: string; // Issuer
  aud: string; // Audience
  exp: number; // Expiration (UNIX timestamp)
  iat: number; // Issued at
  jti: string; // JWT ID (for revocation)

  // Custom claims
  email?: string;
  role?: string;
  permissions?: string[];
}
```

### Token Generation (NestJS)

```typescript
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Short-lived access token
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    // Longer refresh token
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: uuidv7() },
      {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    // Store refresh token hash for revocation
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }
}
```

### Token Validation

```typescript
// auth/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      issuer: 'auth.myapp.com',
      audience: 'myapp',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

## Session-Based Authentication

### Session Configuration (NestJS + Express)

```typescript
import session from 'express-session';
import { createClient } from 'ioredis';
import RedisStore from 'connect-redis';

const redisClient = createClient({
  host: process.env.VALKEY_HOST,
  port: 6379,
});

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);
```

### BFF Pattern (Recommended for SPAs)

```
┌──────────┐     Cookie      ┌──────────┐      JWT       ┌──────────┐
│  React   │ ◄─────────────► │   BFF    │ ◄────────────► │   API    │
│   SPA    │   (Session)     │ (Node.js)│   (Internal)   │ Services │
└──────────┘                 └──────────┘                └──────────┘
```

```typescript
// BFF endpoint
@Controller('api')
export class BffController {
  @Post('login')
  async login(@Body() dto: LoginDto, @Session() session: Express.Session): Promise<LoginResponse> {
    // Validate credentials
    const user = await this.authService.validateUser(dto);

    // Store user in session (server-side)
    session.userId = user.id;
    session.role = user.role;

    // Return user info (no tokens exposed to client)
    return { user: { id: user.id, email: user.email } };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async getMe(@Session() session: Express.Session): Promise<User> {
    return this.userService.findById(session.userId);
  }
}
```

## OAuth2 Integration

### Google OAuth (Passport)

```typescript
// auth/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { emails, displayName, photos } = profile;

    const user = await this.authService.findOrCreateOAuthUser({
      email: emails[0].value,
      name: displayName,
      avatar: photos[0]?.value,
      provider: 'google',
      providerId: profile.id,
    });

    done(null, user);
  }
}
```

### OAuth Flow Controller

```typescript
@Controller('auth')
export class AuthController {
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    // User is now in req.user
    const tokens = await this.authService.generateTokens(req.user);

    // Set tokens in HTTP-only cookies
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    res.redirect('/dashboard');
  }
}
```

## Password Security

### Hashing with Argon2

```typescript
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
```

### Password Policy

```typescript
import { z } from 'zod';

const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain special character');
```

## Multi-Factor Authentication (MFA)

### TOTP Setup

```typescript
import { authenticator } from 'otplib';

@Injectable()
export class MfaService {
  generateSecret(email: string): MfaSetup {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'MyApp', secret);

    return {
      secret,
      qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(otpauth)}`,
    };
  }

  verifyToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
```

## Rate Limiting

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests
      },
    ]),
  ],
})
export class AppModule {}

// Apply to login endpoint
@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.authService.login(dto);
  }
}
```

## Token Security Checklist

```
✅ Short-lived access tokens (15-30 min)
✅ Refresh tokens stored server-side (Redis)
✅ HTTP-only, Secure, SameSite cookies
✅ Token rotation on refresh
✅ Revocation mechanism (jti tracking)
✅ Rate limiting on auth endpoints
✅ Account lockout after failed attempts
✅ Secure password hashing (Argon2id)
✅ MFA for sensitive operations
```

## Security Headers

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

## Anti-Patterns

| Don't                     | Do                      | Reason         |
| ------------------------- | ----------------------- | -------------- |
| Store JWT in localStorage | HTTP-only cookies       | XSS protection |
| Long-lived access tokens  | Short access + refresh  | Limit exposure |
| MD5/SHA1 for passwords    | Argon2id or bcrypt      | Secure hashing |
| Skip rate limiting        | Throttle auth endpoints | Brute force    |
| Trust client tokens       | Validate server-side    | Security       |
| Single secret for all     | Separate secrets        | Isolation      |

## Sources

- [Passport JWT Documentation](https://www.passportjs.org/packages/passport-jwt/)
- [JWT Authentication Best Practices](https://medium.com/@mukarramjavid/jwt-authentication-with-passport-passport-jwt-in-nodejs-ec177cb49655)
- [Node.js Authentication Guide](https://www.bomberbot.com/authentication/user-authentication-in-node-js-with-passport-js-and-jwt-the-ultimate-guide/)
- [Passport.js Strategies Guide](https://leapcell.io/blog/mastering-authentication-in-express-with-passport-js-strategies)
- [Node.js JWT Guide](https://softwareontheroad.com/nodejs-jwt-authentication-oauth)
