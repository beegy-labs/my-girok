# 동의 흐름 가이드

> GDPR, PIPA, CCPA 준수를 위한 국가별 사용자 동의 관리

## 동의 유형

### 필수 동의 (모든 국가)

이 동의는 필수이며, 사용자는 동의하지 않으면 진행할 수 없습니다:

| Type             | Purpose                         |
| ---------------- | ------------------------------- |
| TERMS_OF_SERVICE | 서비스 약관 및 조건에 대한 동의 |
| PRIVACY_POLICY   | 데이터 처리 관행에 대한 인정    |

### 선택적 동의

사용자는 이 동의에 대해 동의하거나 거부할 수 있습니다:

| Type                  | Countries    | Purpose                                |
| --------------------- | ------------ | -------------------------------------- |
| MARKETING_EMAIL       | All          | 프로모션 이메일 수신                   |
| MARKETING_PUSH        | All          | 푸시 알림 수신                         |
| MARKETING_PUSH_NIGHT  | KR only      | 야간 푸시 (21:00-08:00, PIPA 요구사항) |
| CROSS_BORDER_TRANSFER | JP only      | 일본 외 데이터 전송 (APPI 요구사항)    |
| CROSS_SERVICE_SHARING | UNIFIED mode | 연결된 서비스 간 데이터 공유           |

## 국가별 규칙

| Country            | Regulation | Key Rules                                       |
| ------------------ | ---------- | ----------------------------------------------- |
| KR (Korea)         | PIPA       | 최소 연령 14세 이상, 야간 푸시 동의 필요        |
| EU (Europe)        | GDPR       | 최소 연령 16세 이상, 365일 동의 보존, 삭제 권리 |
| JP (Japan)         | APPI       | 국경 간 전송 동의 필요                          |
| US/CA (California) | CCPA       | 최소 연령 13세 이상, "판매 금지" 옵션 필요      |

## API 엔드포인트

### 동의 요구사항 조회

특정 서비스와 국가에 대한 필수 동의를 조회합니다:

```
GET /v1/services/resume/consent-requirements?countryCode=KR
```

국가 규정에 따라 필수 및 선택적 동의 목록을 반환합니다.

### 동의와 함께 서비스 가입

동의 계약을 제공하면서 서비스에 등록합니다:

```
POST /v1/services/resume/join
{
  "countryCode": "KR",
  "consents": [
    {
      "type": "TERMS_OF_SERVICE",
      "agreed": true,
      "documentId": "doc-tos-kr"
    },
    {
      "type": "PRIVACY_POLICY",
      "agreed": true,
      "documentId": "doc-pp-kr"
    },
    {
      "type": "MARKETING_EMAIL",
      "agreed": true
    }
  ]
}
```

### 개별 동의 업데이트

특정 동의 선호도를 수정합니다:

```
PUT /v1/services/resume/consent
{
  "consentType": "MARKETING_EMAIL",
  "countryCode": "KR",
  "agreed": false
}
```

### 모든 동의 조회

현재 사용자의 모든 동의 기록을 조회합니다:

```
GET /v1/legal/consents
```

## 가드 구현

### CountryConsentGuard

특정 국가 동의가 필요한 엔드포인트를 보호합니다:

```typescript
@UseGuards(UnifiedAuthGuard, CountryConsentGuard)
@RequireCountryConsent('KR')
async getKoreaFeature() {
  // Only accessible to users with Korean consents
}
```

## 감사 추적

모든 동의 변경 사항은 다음과 함께 기록됩니다:

- 타임스탬프 (ISO 8601)
- IP 주소
- 사용자 에이전트
- 문서 버전

동의 통계 조회:

```
GET /v1/admin/legal/consents/stats?range=30d
```

## 오류 처리

| HTTP Code | Error                   | Cause                                                |
| --------- | ----------------------- | ---------------------------------------------------- |
| 400       | 필수 동의 누락          | TERMS_OF_SERVICE 또는 PRIVACY_POLICY에 동의하지 않음 |
| 400       | 유효하지 않은 국가 코드 | 유효한 2자 ISO 국가 코드가 아님                      |
| 409       | 동의가 이미 존재함      | CREATE 대신 UPDATE 엔드포인트 사용                   |

## 구현 흐름

```
1. User initiates registration
2. Frontend calls GET /consent-requirements
3. Display consent form with required/optional items
4. User reviews and agrees to consents
5. Frontend calls POST /join with consents
6. Backend validates all required consents present
7. Backend creates consent records with audit trail
8. User gains access to service
```

## 모범 사례

1. **명확한 언어**: 동의 설명에 일반 언어를 사용합니다
2. **세분화된 제어**: 사용자가 각 동의를 개별적으로 관리할 수 있도록 합니다
3. **쉽게 철회**: 선택적 동의를 쉽게 철회할 수 있도록 합니다
4. **버전 추적**: 동의를 특정 문서 버전에 연결합니다
5. **모든 것 감사**: 규정 준수를 위해 모든 동의 변경 사항을 기록합니다

---

**LLM Reference**: `docs/llm/guides/CONSENT_FLOW.md`
