# 글로벌 계정 정책

> 통합 및 서비스별 모드로 다중 서비스 계정 관리

## 계정 모드

| 모드   | 설명             | 토큰 범위          |
| ------ | ---------------- | ------------------ |
| 서비스 | 서비스별 독립적  | 단일 서비스 접근   |
| 통합   | 다중 서비스 통합 | 연결된 모든 서비스 |

## 등록 흐름

```
1. User signup
2. Check if email exists
3. Select country
4. Display consent form (based on Law Registry)
5. User submits consents
6. Create UserService record
7. Issue access token
```

## 국가별 법률 레지스트리

| 코드 | 국가 | 최소 연령 | 핵심 요구 사항               |
| ---- | ---- | --------- | ---------------------------- |
| PIPA | KR   | 14        | 야간 푸시 동의 (21:00-08:00) |
| GDPR | EU   | 16        | 365일 동의 보존              |
| APPI | JP   | -         | 국경 간 전송 동의            |
| CCPA | US   | 13        | 제3자 옵트아웃 옵션          |

## 동의 요구 사항

### 필수 동의 (모든 국가)

- TERMS_OF_SERVICE
- PRIVACY_POLICY

### 선택적 동의

```yaml
all_countries:
  - MARKETING_EMAIL
  - MARKETING_PUSH
  - MARKETING_SMS
  - PERSONALIZED_ADS
  - THIRD_PARTY_SHARING

country_specific:
  KR:
    - MARKETING_PUSH_NIGHT
  JP:
    - CROSS_BORDER_TRANSFER

unified_mode_only:
  - CROSS_SERVICE_SHARING
```

## 토큰 페이로드

### 사용자 토큰

```json
{
  "sub": "01935c6d-c2d0-7abc-8def-1234567890ab",
  "type": "USER_ACCESS",
  "accountMode": "SERVICE",
  "countryCode": "KR",
  "services": {
    "resume": {
      "status": "ACTIVE",
      "countries": ["KR"]
    }
  }
}
```

### 관리자 토큰

```json
{
  "sub": "01935c6d-c2d0-7abc-8def-1234567890ab",
  "type": "ADMIN_ACCESS",
  "scope": "SYSTEM",
  "roleName": "system_super",
  "level": 100,
  "permissions": ["*"]
}
```

### 운영자 토큰

```json
{
  "sub": "01935c6d-c2d0-7abc-8def-1234567890ab",
  "type": "OPERATOR_ACCESS",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "content:manage"]
}
```

## 계정 연결

### 전제 조건

- 두 계정에 동일한 이메일 주소가 있어야 합니다.
- 두 계정이 모두 서비스 모드여야 합니다.
- 계정 간에 기존 연결이 없어야 합니다.

### 연결 흐름

```
1. User requests link
2. Link status: PENDING
3. User accepts with password verification
4. User grants platform consents
5. Both accounts transition to UNIFIED mode
6. New unified token issued
```

## 가드 사용

### 서비스 접근 가드

```typescript
@UseGuards(UnifiedAuthGuard, ServiceAccessGuard)
@RequireService('resume')
async getResume() {
  // Only users with resume service access
}
```

### 국가 동의 가드

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaData() {
  // Only users with Korean consents
}
```

### 계정 유형 가드

```typescript
@UseGuards(UnifiedAuthGuard, AccountTypeGuard)
@RequireAccountType('ADMIN')
async adminOnly() {
  // Only admin users
}
```

## 운영자 시스템

| 초대 유형 | 비밀번호 설정                |
| --------- | ---------------------------- |
| EMAIL     | User sets password via link  |
| DIRECT    | Admin sets password directly |

**범위**: 운영자는 할당된 서비스 + 국가 + 권한만 접근할 수 있습니다.

## 데이터베이스 테이블

| 테이블            | 목적                    |
| ----------------- | ----------------------- |
| users             | 계정 모드, 기본 정보    |
| services          | 서비스 정의             |
| user_services     | 사용자-서비스-국가 관계 |
| user_consents     | 서비스별 동의 기록      |
| law_registry      | 국가별 요구 사항        |
| account_links     | SERVICE → UNIFIED 전환  |
| operators         | 서비스 운영자 계정      |
| platform_consents | 교차 서비스 동의 기록   |

## 엔티티 관계

```
User 1:N UserService N:1 Service
User 1:N UserConsent
User 1:1 PersonalInfo
User 1:N AccountLink
Service 1:N Operator
Admin 1:N Operator
```

**LLM 참조**: `docs/llm/policies/GLOBAL_ACCOUNT.md`
