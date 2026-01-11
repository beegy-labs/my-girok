# 보안 정책

> 입력 검증, 인증, 및 보안 모범 사례

## 입력 검증

항상 class-validator 데코레이터를 사용하여 사용자 입력을 검증하고 정제합니다:

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @MaxLength(10000)
  content: string;
}
```

## 일반 취약점 및 예방

| 취약점        | 예방 전략                                                                |
| ------------- | ------------------------------------------------------------------------ |
| SQL Injection | Prisma 매개변수화 쿼리 사용 (사용자 입력과 함께 원시 SQL 절대 사용 금지) |
| XSS           | DOMPurify를 사용하여 HTML 정제, 모든 출력 이스케이프                     |
| CSRF          | SameSite 쿠키, 상태 변경 작업에 CSRF 토큰 사용                           |
| File Upload   | MIME 검증, 10MB 제한, 무작위 파일명                                      |

## 속도 제한

| 엔드포인트 유형 | 제한     | 단위        |
| --------------- | -------- | ----------- |
| 로그인/등록     | 5 요청   | 분당/IP     |
| 인증된 API      | 100 요청 | 분당/사용자 |
| 파일 업로드     | 10 요청  | 분당/사용자 |

## CORS 설정

```typescript
app.enableCors({
  origin: ['https://mygirok.dev', 'https://admin.mygirok.dev'],
  credentials: true,
  maxAge: 3600,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

## 비밀 관리

| 해야 할 일                              | 하지 말아야 할 일         |
| --------------------------------------- | ------------------------- |
| ConfigService를 사용하여 환경 변수 관리 | 비밀을 git에 커밋 금지    |
| JWT 키를 90일마다 회전                  | 코드에 비밀 하드코딩 금지 |
| Kubernetes에서 Sealed Secrets 사용      | 민감 데이터 로깅 금지     |
| 환경별 별도 비밀 사용                   | 환경 간 비밀 공유 금지    |

## JWT 토큰 정책

| 토큰 유형     | 만료 | 저장 위치     |
| ------------- | ---- | ------------- |
| 액세스 토큰   | 15분 | localStorage  |
| 리프레시 토큰 | 14일 | HttpOnly 쿠키 |

## 비밀번호 요구 사항

```yaml
minimum_length: 8
required_characters:
  - uppercase letter
  - lowercase letter
  - number
  - special character (!@#$%^&*)
hashing:
  algorithm: bcrypt
  rounds: 12
```

## 보안 헤더

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
```

## 모바일 브라우저 고려 사항

| 브라우저        | 고려 사항                                        |
| --------------- | ------------------------------------------------ |
| iOS Safari      | CORS 사전 요청 캐싱에 명시적 maxAge 필요         |
| 모든 모바일     | Authorization 헤더가 사전 요청을 트리거          |
| 공개 엔드포인트 | 인터셉터에서 인증 헤더를 건너뛰어 사전 요청 방지 |

---

**LLM 참조**: `docs/llm/policies/SECURITY.md`
