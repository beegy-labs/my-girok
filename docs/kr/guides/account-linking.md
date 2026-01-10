# 계정 연결 가이드

> 여러 서비스 계정을 하나의 통합 다중 서비스 계정으로 연결합니다

## 개요

계정 연결은 사용자가 별개의 **SERVICE** 모드 계정을 하나의 **UNIFIED** 계정으로 연결할 수 있게 하여, 하나의 로그인으로 여러 서비스에 원활하게 접근할 수 있도록 합니다.

## 사전 조건

계정이 연결되기 전에 다음 모든 조건을 충족해야 합니다:

| 요구 사항        | 설명                                                              |
| ---------------- | ----------------------------------------------------------------- |
| 같은 이메일      | 두 계정 모두 동일한 이메일 주소를 사용해야 합니다                 |
| **SERVICE** 모드 | 두 계정 모두 **SERVICE** 모드여야 합니다                          |
| 기존 연결 없음   | 두 계정 중 어느 것도 이미 다른 계정과 연결되어 있지 않아야 합니다 |

## 연결 흐름

```
1. User A requests to link with User B
2. Link status set to PENDING
3. User B accepts with password verification
4. User B grants platform consents (CROSS_SERVICE_SHARING)
5. Both accounts transition to UNIFIED mode
6. New unified token issued with access to all services
```

## API 엔드포인트

### 연결 가능한 계정 찾기

현재 사용자와 연결할 수 있는 계정을 찾습니다:

```
GET /v1/users/me/linkable-accounts
```

**SERVICE** 모드에서 이메일이 일치하는 계정을 반환합니다.

### 계정 연결 요청

다른 계정에 연결 요청을 시작합니다:

```
POST /v1/users/me/link-account
{
  "linkedUserId": "target-account-uuid"
}
```

### 연결 요청 수락

보류 중인 연결 요청을 수락합니다 (비밀번호 확인 필요):

```
POST /v1/users/me/accept-link
{
  "linkId": "link-request-uuid",
  "password": "user-password",
  "platformConsents": [
    {
      "type": "CROSS_SERVICE_SHARING",
      "countryCode": "KR",
      "agreed": true
    }
  ]
}
```

### 연결된 계정 보기

현재 사용자와 연결된 모든 계정을 나열합니다:

```
GET /v1/users/me/linked-accounts
```

### 계정 연결 해제

계정 간 연결을 해제합니다:

```
DELETE /v1/users/me/linked-accounts/{linkId}
```

## 필수 동의

| 동의 유형             | 필수 | 설명                                      |
| --------------------- | ---- | ----------------------------------------- |
| CROSS_SERVICE_SHARING | 예   | 연결된 서비스 간 데이터 공유를 허용합니다 |
| PRIVACY_POLICY        | 권장 | 플랫폼 수준의 개인정보 보호 동의          |

## 통합 토큰 구조

성공적인 연결 후, 사용자는 통합 토큰을 받습니다:

```json
{
  "sub": "account-a-uuid",
  "type": "USER_ACCESS",
  "accountMode": "UNIFIED",
  "services": {
    "resume": {
      "status": "ACTIVE",
      "countries": ["KR"]
    },
    "feed": {
      "status": "ACTIVE",
      "countries": ["KR"]
    }
  }
}
```

## 연결 해제 동작

계정이 연결 해제될 때:

- 연결 상태가 **UNLINKED**로 변경됩니다
- 다른 연결이 없으면 계정이 **SERVICE** 모드로 복원됩니다
- 개인정보 및 동의는 보존됩니다
- 원래 서비스에 대한 접근은 유지됩니다

## 오류 처리

| HTTP 코드 | 오류                 | 원인                                                  |
| --------- | -------------------- | ----------------------------------------------------- |
| 409       | Link already exists  | 계정이 이미 연결되어 있습니다                         |
| 400       | Both already UNIFIED | 계정이 이미 **UNIFIED** 모드이므로 연결할 수 없습니다 |
| 401       | Invalid password     | 비밀번호 확인에 실패했습니다                          |

## 보안 고려 사항

- 연결 수락 시 비밀번호 확인이 항상 필요합니다
- 이메일 주소가 일치하는 계정만 연결할 수 있습니다
- 모든 연결 작업은 감사 로그에 기록됩니다
- 연결 요청은 설정 가능한 기간 후 만료됩니다

---

**LLM Reference**: `docs/llm/guides/ACCOUNT_LINKING.md`
