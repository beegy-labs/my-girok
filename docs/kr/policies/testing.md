# 테스트 정책

> 80% 커버리지 요구사항이 있는 테스트 주도 개발

## 커버리지 요구사항

| 지표 | 최소값 | 적용 방식    |
| ---- | ------ | ------------ |
| 문장 | 80%    | CI 블록 병합 |
| 분기 | 70%    | 경고만       |
| 함수 | 80%    | CI 블록 병합 |
| 줄   | 80%    | CI 블록 병합 |

## 변경 유형별 테스트 요구사항

| 변경 유형        | 필수 테스트                      |
| ---------------- | -------------------------------- |
| 새 서비스 메서드 | 단위 테스트                      |
| 새 엔드포인트    | 컨트롤러 테스트 + E2E 테스트     |
| 버그 수정        | 수정 사항을 증명하는 회귀 테스트 |
| 리팩터링         | 기존 테스트 모두 통과해야 함     |

## 테스트 주도 개발 (TDD)

Red-Green-Refactor 사이클을 따르세요:

```
RED -> Write a failing test
GREEN -> Write minimal code to pass
REFACTOR -> Clean up while tests pass
```

## 테스트 구조 템플릿

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: mockRepository }],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user and return with id', async () => {
      // Arrange
      const dto = { email: 'test@example.com', name: 'Test' };
      mockRepository.create.mockResolvedValue({ id: '1', ...dto });

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toHaveProperty('id', '1');
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });
  });
});
```

## CI 파이프라인 체크리스트

```yaml
test:
  steps:
    - pnpm test # Run all tests
    - pnpm lint # Lint check
    - pnpm build # Build check
    - coverage >= 80% # Coverage gate
```

## 데이터베이스 테스트

고립된 테스트 데이터베이스를 사용하세요:

```typescript
// test/setup.ts
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_db';
```

## gRPC 테스트

### 소비자 측 (모의 클라이언트)

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockIdentityClient: jest.Mocked<IdentityGrpcClient>;

  beforeEach(async () => {
    mockIdentityClient = {
      getAccount: jest.fn(),
      getProfile: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [MyService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
    }).compile();

    service = module.get(MyService);
  });
});
```

### 공급자 측 (컨트롤러 테스트)

| 테스트 케이스      | 필수 |
| ------------------ | ---- |
| 성공적인 정상 경로 | 예   |
| NOT_FOUND 오류     | 예   |
| RpcException 래핑  | 예   |
| Proto 타입 변환    | 예   |
| 검증 오류          | 예   |

## 파일 명명 규칙

| 테스트 유형          | 파일 패턴                   |
| -------------------- | --------------------------- |
| 단위 테스트          | `*.spec.ts`                 |
| E2E 테스트           | `*.e2e-spec.ts`             |
| gRPC 컨트롤러 테스트 | `*.grpc.controller.spec.ts` |

## 병렬 테스트 실행

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',
  cache: true,
  testTimeout: 10000,
};
```

### 병렬화 안전성

| 병렬 실행에 안전                 | 병렬 실행에 위험               |
| -------------------------------- | ------------------------------ |
| 모의 객체를 사용하는 단위 테스트 | 데이터베이스를 공유하는 테스트 |
| 테스트마다 고립된 상태           | 파일 시스템 연산               |
| 메모리 내 연산                   |                                |

---

**LLM 참조**: `docs/llm/policies/TESTING.md`
