# Identity Platform 정책

> 인증, 권한 부여 및 법적 준수를 위한 다중 서비스 아키텍처

## 아키텍처 개요

```
identity-service (3005) -> identity_db
auth-service     (3001) -> auth_db
legal-service    (3006) -> legal_db
```

## 도메인 소유권

| 도메인                                   | 서비스           | 데이터베이스 |
| ---------------------------------------- | ---------------- | ------------ |
| Accounts, Sessions, Devices, Profiles    | identity-service | identity_db  |
| Roles, Permissions, Operators, Sanctions | auth-service     | auth_db      |
| Consents, Documents, Laws, DSR           | legal-service    | legal_db     |

## 반패턴 (절대 하지 말아야 할 것들)

```yaml
NEVER:
  - Add roles/permissions to identity-service
  - Add consent logic to identity-service
  - Add account/session to auth-service
  - Cross-database JOINs
  - Direct database access across services
```

## 올바른 패턴 (해야 할 것들)

```yaml
DO:
  - Use gRPC calls between services
  - API composition in BFF layer
  - Outbox events per service
  - Cross-service UUID references (no foreign keys)
```

## 서비스 간 통신

```
identity-service <--gRPC--> auth-service <--gRPC--> legal-service
```

## ID 생성 (UUIDv7)

모든 ID는 RFC 9562 UUIDv7 형식을 사용합니다:

- 시간 정렬 가능하여 효율적인 인덱싱
- 애플리케이션에서 생성 (DB 시퀀스 없음)
- 예시: `01935c6d-c2d0-7abc-8def-1234567890ab`

## 데이터베이스 테이블

### identity_db

```sql
accounts, account_profiles, credentials, sessions, devices,
app_registry, account_apps, app_security_configs, app_test_modes,
app_service_status, app_version_policies, outbox_events
```

### auth_db

```sql
roles, permissions, role_permissions, admins, admin_roles,
operators, sanctions, api_keys, outbox_events
```

### legal_db

```sql
laws, law_requirements, countries, consent_documents,
account_consents, data_subject_requests, consent_history, outbox_events
```

## 다중 인증 (MFA)

| 방법  | 표준                  |
| ----- | --------------------- |
| TOTP  | RFC 6238              |
| SMS   | Provider-specific     |
| Email | Custom implementation |

## 계정 잠금 정책

| 설정                | 값   |
| ------------------- | ---- |
| 최대 실패 시도 횟수 | 5    |
| 잠금 기간           | 15분 |
| 실패 시도 재설정 창 | 30분 |

## 데이터 주체 요청 (DSR) 유형

| 유형          | GDPR 기사  | SLA      |
| ------------- | ---------- | -------- |
| ACCESS        | Article 15 | 30 days  |
| RECTIFICATION | Article 16 | 30 days  |
| ERASURE       | Article 17 | 30 days  |
| PORTABILITY   | Article 20 | 30 days  |
| RESTRICTION   | Article 18 | 72 hours |
| OBJECTION     | Article 21 | 72 hours |

## 제재 유형

| 유형                | 효과                         |
| ------------------- | ---------------------------- |
| WARNING             | Notification only            |
| TEMPORARY_BAN       | Access blocked temporarily   |
| PERMANENT_BAN       | Account disabled permanently |
| FEATURE_RESTRICTION | Specific features disabled   |

## 트랜잭셔널 아웃박스 패턴

```typescript
@Transactional()
async createAccount(dto: CreateAccountDto) {
  const account = await this.prisma.accounts.create({
    data: { id: ID.generate(), ...dto }
  });

  await this.prisma.outboxEvents.create({
    data: {
      id: ID.generate(),
      aggregateType: 'ACCOUNT',
      aggregateId: account.id,
      eventType: 'identity.account.created',
      payload: { accountId: account.id, email: dto.email }
    }
  });

  return account;
}
```

## 이벤트 게시 진화

| 단계    | 방법                     | 상태    |
| ------- | ------------------------ | ------- |
| Current | Polling (5s cron job)    | Active  |
| Future  | Debezium CDC -> Redpanda | Planned |

## 보안 수준

| 레벨     | 도메인 검증 | JWT 필요 | 헤더 검사 |
| -------- | ----------- | -------- | --------- |
| STRICT   | Yes         | Yes      | Yes       |
| STANDARD | No          | Yes      | Yes       |
| RELAXED  | No          | Yes      | No        |

**참고**: 보안 수준에 관계없이 JWT 인증은 항상 필요합니다.

## 테스트 모드 설정

| 제약 조건          | 값        |
| ------------------ | --------- |
| Maximum Duration   | 7 days    |
| IP Whitelist       | Required  |
| JWT Authentication | Always ON |

## 앱 확인 API

```
GET /v1/apps/{appSlug}/check
```

| 상태 코드 | 조건                  | 클라이언트 동작          |
| --------- | --------------------- | ------------------------ |
| 200       | Normal operation      | Continue                 |
| 426       | Force update required | Redirect to app store    |
| 503       | Maintenance mode      | Show maintenance message |
| 410       | App terminated        | Show termination notice  |

## 플랫폼 진화

| 단계    | 상태    | 통신 | 이벤트       |
| ------- | ------- | ---- | ------------ |
| Phase 3 | Current | gRPC | Polling      |
| Phase 4 | Future  | gRPC | Redpanda CDC |

## Redpanda vs Kafka

| 측면      | Kafka    | Redpanda   |
| --------- | -------- | ---------- |
| Runtime   | JVM      | C++        |
| Memory    | 6GB+     | 1-2GB      |
| Latency   | ~10ms    | ~1ms       |
| Zookeeper | Required | Not needed |

## 준수 표준

| 표준                      | 상태                 |
| ------------------------- | -------------------- |
| RFC 9562 (UUIDv7)         | Implemented          |
| RFC 9700 (OAuth 2.0)      | Implemented          |
| RFC 9068 (JWT)            | Implemented          |
| RFC 9449 (DPoP)           | Ready for deployment |
| NIST 800-207 (Zero Trust) | Implemented          |

**LLM 참조**: `docs/llm/policies/IDENTITY_PLATFORM.md`
