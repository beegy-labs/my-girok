# gRPC Inter-Service Communication 가이드

> 타입 안전하고 고성능의 백엔드 서비스 간 통신

## 아키텍처 개요

```
identity-service (REST:3005, gRPC:50051) <->
auth-service (REST:3001, gRPC:50052) <->
legal-service (REST:3006, gRPC:50053)
```

모든 내부 서비스 통신은 성능과 타입 안전성을 위해 gRPC를 사용합니다. REST 엔드포인트는 외부 클라이언트용으로 노출됩니다.

## 프로토 파일 구조

```
packages/proto/
├── buf.yaml           # Buf 설정
├── buf.gen.yaml       # 코드 생성 설정
├── identity/v1/identity.proto
├── auth/v1/auth.proto
└── legal/v1/legal.proto
```

### TypeScript 타입 생성

```bash
cd packages/proto && pnpm generate
```

출력 위치: `packages/types/src/generated/proto/`

## 서버 설정

### 설치

```bash
pnpm add @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
```

### 컨트롤러 구현

```typescript
@Controller()
export class IdentityGrpcController {
  constructor(private readonly accountsService: AccountsService) {}

  @GrpcMethod('IdentityService', 'GetAccount')
  async getAccount(request: { id: string }) {
    const account = await this.accountsService.findById(request.id);
    return { account: this.toProtoAccount(account) };
  }

  @GrpcMethod('IdentityService', 'ValidateAccount')
  async validateAccount(request: { id: string }) {
    const account = await this.accountsService.findById(request.id);
    return {
      valid: !!account && account.status === 'ACTIVE',
      status: account?.status,
    };
  }
}
```

### 메인 애플리케이션 설정

```typescript
// main.ts
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'identity.v1',
    protoPath: join(__dirname, '../../../packages/proto/identity/v1/identity.proto'),
    url: `0.0.0.0:${process.env.IDENTITY_GRPC_PORT || 50051}`,
    loader: {
      keepCase: true,
      longs: String,
      enums: Number,
      defaults: true,
      oneofs: true,
    },
  },
});
await app.startAllMicroservices();
```

## 클라이언트 설정

### 모듈 등록

```typescript
@Module({
  imports: [
    GrpcClientsModule.forRoot({
      identity: true,
      auth: true,
      legal: true,
    }),
  ],
})
export class AppModule {}
```

### 서비스 사용

```typescript
import { IdentityGrpcClient, AuthGrpcClient, LegalGrpcClient } from '@my-girok/nest-common';

@Injectable()
export class UserAccessService {
  constructor(
    private readonly identityClient: IdentityGrpcClient,
    private readonly authClient: AuthGrpcClient,
    private readonly legalClient: LegalGrpcClient,
  ) {}

  async validateUserAccess(accountId: string, countryCode: string) {
    // Check account status
    const { valid, status } = await this.identityClient.validateAccount({
      id: accountId,
    });
    if (!valid || status !== 'ACTIVE') {
      return { allowed: false, reason: 'ACCOUNT_INACTIVE' };
    }

    // Check sanctions
    const { is_sanctioned } = await this.authClient.checkSanction({
      subject_id: accountId,
      subject_type: 'ACCOUNT',
    });
    if (is_sanctioned) {
      return { allowed: false, reason: 'SANCTIONED' };
    }

    // Check consents
    const { all_required_granted, missing } = await this.legalClient.checkConsents({
      account_id: accountId,
      country_code: countryCode,
      required_types: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    });
    if (!all_required_granted) {
      return { allowed: false, reason: 'MISSING_CONSENTS', missing };
    }

    return { allowed: true };
  }
}
```

## gRPC 상태 코드

| gRPC 코드         | HTTP 동등 | 사용 사례                              |
| ----------------- | --------- | -------------------------------------- |
| OK                | 200       | 성공적인 작업                          |
| NOT_FOUND         | 404       | 리소스가 존재하지 않음                 |
| ALREADY_EXISTS    | 409       | 중복 리소스                            |
| INVALID_ARGUMENT  | 400       | 잘못된 요청 매개변수                   |
| UNAUTHENTICATED   | 401       | 자격 증명이 누락되었거나 유효하지 않음 |
| PERMISSION_DENIED | 403       | 권한 부족                              |
| DEADLINE_EXCEEDED | 408       | 요청 시간 초과                         |
| UNAVAILABLE       | 503       | 서비스 일시적으로 사용 불가            |
| INTERNAL          | 500       | 예상치 못한 서버 오류                  |

## 오류 처리

### 클라이언트 측

```typescript
import { isGrpcError } from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';

try {
  return await this.identityClient.getAccount({ id });
} catch (error) {
  if (isGrpcError(error)) {
    switch (error.code) {
      case GrpcStatus.NOT_FOUND:
        throw new NotFoundException('Account not found');
      case GrpcStatus.DEADLINE_EXCEEDED:
        throw new RequestTimeoutException();
      case GrpcStatus.UNAVAILABLE:
        throw new ServiceUnavailableException();
    }
  }
  throw error;
}
```

### 서버 측

```typescript
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

if (!account) {
  throw new RpcException({
    code: GrpcStatus.NOT_FOUND,
    message: 'Account not found',
  });
}
```

## 환경 변수

| 변수               | 기본값    | 목적                      |
| ------------------ | --------- | ------------------------- |
| IDENTITY_GRPC_HOST | localhost | Identity 서비스 호스트    |
| IDENTITY_GRPC_PORT | 50051     | Identity 서비스 gRPC 포트 |
| AUTH_GRPC_HOST     | localhost | Auth 서비스 호스트        |
| AUTH_GRPC_PORT     | 50052     | Auth 서비스 gRPC 포트     |
| LEGAL_GRPC_HOST    | localhost | Legal 서비스 호스트       |
| LEGAL_GRPC_PORT    | 50053     | Legal 서비스 gRPC 포트    |

### Kubernetes 서비스 검색

```yaml
env:
  - name: IDENTITY_GRPC_HOST
    value: identity-service.default.svc.cluster.local
```

## 타임아웃 구성

```typescript
// Custom timeout (default is 5000ms)
const response = await this.identityClient.setTimeout(10000).getAccount({ id: accountId });
```

## 모범 사례

1. **타입이 지정된 클라이언트를 사용하세요**: 항상 `@my-girok/nest-common`에서 제공하는 타입이 지정된 클라이언트를 사용합니다.
2. **오류를 우아하게 처리하세요**: 보안을 위해 기본적으로 거부하도록 fallback 동작을 구현합니다.
3. **데이터베이스에 직접 접근하지 마세요**: 항상 소유 서비스의 gRPC API를 통해 접근합니다.
4. **편의 메서드를 사용하세요**: `hasAcceptedTerms()`와 같은 헬퍼 메서드를 활용합니다.

## 테스트

### 단위 테스트

```typescript
mockIdentityClient = {
  getAccount: jest.fn(),
  validateAccount: jest.fn(),
} as any;

const module = await Test.createTestingModule({
  providers: [SomeService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
}).compile();
```

### 통합 테스트

```typescript
const module = await Test.createTestingModule({
  imports: [GrpcClientsModule.forRoot({ identity: true })],
}).compile();

identityClient = module.get(IdentityGrpcClient);
identityClient.onModuleInit();
```

## 문제 해결

| 이슈               | 확인 사항                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Connection Refused | 서비스가 실행 중인가요? 호스트/포트 설정이 올바른가요? K8s 네트워크 정책이 적용되었나요? |
| Deadline Exceeded  | 타임아웃을 늘리세요, 서비스 상태를 확인하세요, 느린 DB 쿼리를 찾아보세요                 |
| Unavailable        | 서비스가 다운되었나요? 네트워크 문제인가요? K8s DNS 해석을 확인하세요                    |

### 디버그 모드

```bash
GRPC_VERBOSITY=DEBUG GRPC_TRACE=all node dist/main.js
```

---

**LLM 참조**: `docs/llm/guides/GRPC.md`
