// Unsafe default values that must not be used in production
const UNSAFE_DEFAULTS = {
  SESSION_SECRET: 'session-secret-change-in-production',
  ENCRYPTION_KEY: 'encryption-key-32-chars-change!',
} as const;

/**
 * Validates that critical secrets are properly configured in production.
 * Throws an error if unsafe default values are detected in production environment.
 */
function validateProductionSecrets(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const errors: string[] = [];

  // Validate SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === UNSAFE_DEFAULTS.SESSION_SECRET) {
    errors.push('SESSION_SECRET must be set to a secure value in production');
  } else if (sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long');
  }

  // Validate ENCRYPTION_KEY
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey === UNSAFE_DEFAULTS.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY must be set to a secure value in production');
  } else if (encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be exactly 32 characters for AES-256');
  }

  // Validate VALKEY_PASSWORD in production
  const valkeyPassword = process.env.VALKEY_PASSWORD;
  if (!valkeyPassword) {
    errors.push('VALKEY_PASSWORD must be set in production');
  }

  if (errors.length > 0) {
    const errorMessage = [
      '🚨 CRITICAL SECURITY ERROR: Unsafe configuration detected in production!',
      '',
      'The following security requirements are not met:',
      ...errors.map((e) => `  - ${e}`),
      '',
      'Application startup aborted to prevent security vulnerabilities.',
      'Please configure all required environment variables properly.',
    ].join('\n');

    throw new Error(errorMessage);
  }
}

// Run validation on module load
validateProductionSecrets();

export default () => ({
  port: parseInt(process.env.PORT || '4005', 10),

  session: {
    secret: process.env.SESSION_SECRET || UNSAFE_DEFAULTS.SESSION_SECRET,
    cookieName: process.env.SESSION_COOKIE_NAME || 'girok_session',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000', 10), // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.SESSION_SAME_SITE as 'strict' | 'lax' | 'none') || 'strict',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || UNSAFE_DEFAULTS.ENCRYPTION_KEY,
  },

  valkey: {
    host: process.env.VALKEY_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || '',
    db: parseInt(process.env.VALKEY_DB || '3', 10), // DB 3 for auth-bff sessions
  },

  grpc: {
    identity: {
      host: process.env.IDENTITY_GRPC_HOST || 'localhost',
      port: parseInt(process.env.IDENTITY_GRPC_PORT || '50051', 10),
    },
    auth: {
      host: process.env.AUTH_GRPC_HOST || 'localhost',
      port: parseInt(process.env.AUTH_GRPC_PORT || '50052', 10),
    },
    legal: {
      host: process.env.LEGAL_GRPC_HOST || 'localhost',
      port: parseInt(process.env.LEGAL_GRPC_PORT || '50053', 10),
    },
    audit: {
      host: process.env.AUDIT_GRPC_HOST || 'localhost',
      port: parseInt(process.env.AUDIT_GRPC_PORT || '50054', 10),
    },
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    adminUrl: process.env.FRONTEND_ADMIN_URL || 'http://localhost:3001',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4005/oauth/google/callback',
    },
    kakao: {
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      callbackUrl: process.env.KAKAO_CALLBACK_URL || 'http://localhost:4005/oauth/kakao/callback',
    },
    naver: {
      clientId: process.env.NAVER_CLIENT_ID || '',
      clientSecret: process.env.NAVER_CLIENT_SECRET || '',
      callbackUrl: process.env.NAVER_CALLBACK_URL || 'http://localhost:4005/oauth/naver/callback',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      privateKey: process.env.APPLE_PRIVATE_KEY || '',
      callbackUrl: process.env.APPLE_CALLBACK_URL || 'http://localhost:4005/oauth/apple/callback',
    },
  },

  rateLimit: {
    login: {
      perIp: parseInt(process.env.RATE_LIMIT_LOGIN_IP || '5', 10),
      perIpTtl: parseInt(process.env.RATE_LIMIT_LOGIN_IP_TTL || '60000', 10),
      perAccount: parseInt(process.env.RATE_LIMIT_LOGIN_ACCOUNT || '10', 10),
      perAccountTtl: parseInt(process.env.RATE_LIMIT_LOGIN_ACCOUNT_TTL || '3600000', 10),
    },
    mfa: {
      perIp: parseInt(process.env.RATE_LIMIT_MFA_IP || '5', 10),
      perIpTtl: parseInt(process.env.RATE_LIMIT_MFA_IP_TTL || '60000', 10),
    },
    register: {
      perIp: parseInt(process.env.RATE_LIMIT_REGISTER_IP || '3', 10),
      perIpTtl: parseInt(process.env.RATE_LIMIT_REGISTER_IP_TTL || '60000', 10),
    },
  },
});
