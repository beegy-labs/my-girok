# 법률 및 동의 정책

> GDPR, PIPA, 및 CCPA 준수를 위한 동의 관리

## 규제 준수

| Regulation | Region        | Key Requirements                        |
| ---------- | ------------- | --------------------------------------- |
| GDPR       | EU            | 72시간 이내 위반 통지, 데이터 이동성    |
| PIPA       | Korea         | 야간 푸시 동의 (21:00-08:00), 14세 이상 |
| CCPA       | US-California | “Do not sell” 옵션, 공개 권리           |

## 동의 유형

### 필수 동의 (없으면 진행 불가)

| Type             | Legal Basis |
| ---------------- | ----------- |
| TERMS_OF_SERVICE | 계약 이행   |
| PRIVACY_POLICY   | 법적 의무   |

### 선택적 동의

| Type                 | Legal Basis | Notes            |
| -------------------- | ----------- | ---------------- |
| MARKETING_EMAIL      | 명시적 동의 |                  |
| MARKETING_PUSH       | 명시적 동의 |                  |
| MARKETING_PUSH_NIGHT | 명시적 동의 | 한국 전용 (PIPA) |
| MARKETING_SMS        | 명시적 동의 |                  |
| PERSONALIZED_ADS     | 명시적 동의 |                  |
| THIRD_PARTY_SHARING  | 명시적 동의 |                  |

## 국가-로케일 매핑

| Country | Locale | Applicable Law |
| ------- | ------ | -------------- |
| KR      | ko     | PIPA           |
| JP      | ja     | APPI           |
| US      | en     | CCPA           |
| GB      | en     | GDPR           |
| DE      | de     | GDPR           |
| FR      | fr     | GDPR           |

```typescript
const locale = COUNTRY_TO_LOCALE[detectedCountry] || 'en';
```

## 등록 흐름

```typescript
POST /v1/auth/register
{
  email: "user@example.com",
  password: "secure-password",
  username: "user123",
  consents: [
    { type: "TERMS_OF_SERVICE", agreed: true },
    { type: "PRIVACY_POLICY", agreed: true },
    { type: "MARKETING_EMAIL", agreed: false }
  ],
  country: "KR",
  language: "ko",
  timezone: "Asia/Seoul"
}
```

## 감사 추적 요구 사항

```yaml
required_fields:
  - user_id
  - consent_type
  - action (agreed/withdrawn)
  - timestamp (ISO 8601)
  - ip_address
  - user_agent
  - document_version
```

## 문서 버전 관리

| Version Change  | 재동의 필요          |
| --------------- | -------------------- |
| v1.0.0 → v1.1.0 | 아니오 (소규모 변경) |
| v1.1.0 → v2.0.0 | 예 (주요 변경)       |

## 데이터 보존 정책

| Data Type     | 보존 기간            |
| ------------- | -------------------- |
| 동의 기록     | 철회 후 5년          |
| 사용자 계정   | 삭제 요청 시까지     |
| 마케팅 데이터 | 마지막 활동 이후 2년 |
| 로그인 기록   | 1년                  |

## 동의 철회

```typescript
PUT /v1/legal/consents/:type
{ agreed: false }
```

| Consent Type     | 철회 가능 | 효과                    |
| ---------------- | --------- | ----------------------- |
| PRIVACY_POLICY   | 아니오    | 계정 삭제 흐름을 트리거 |
| TERMS_OF_SERVICE | 아니오    | 계정 삭제 흐름을 트리거 |
| MARKETING\_\*    | 예        | 해당 마케팅을 중지      |

## 데이터 유출 통지

| Regulation | 시기                          |
| ---------- | ----------------------------- |
| GDPR       | 감독 기관에 72시간 이내       |
| All        | 영향받는 사용자에게 지체 없이 |

## 설계 단계에서의 개인정보 보호 원칙

| 원칙          | 구현                                  |
| ------------- | ------------------------------------- |
| 데이터 최소화 | 필요한 데이터만 수집                  |
| 목적 제한     | 새로운 목적은 새로운 동의를 필요로 함 |
| 보안          | 정지 및 전송 중인 데이터 암호화       |
| 투명성        | 명확한 개인정보 공지                  |
| 사용자 제어   | 간편한 동의 관리 UI                   |

**LLM 참조**: `docs/llm/policies/LEGAL_CONSENT.md`
