# 운영자 관리 가이드

> 범위가 지정된 접근 권한과 권한을 가진 서비스 운영자 관리

## 개요

운영자는 서비스별 사용자로, 할당된 서비스와 국가 내에서 콘텐츠와 사용자를 관리할 수 있습니다. 관리자와 달리 운영자는 제한된 범위를 가지며 관리자 수준의 기능에 접근할 수 없습니다.

## 운영자 생성

### 직접 생성

관리자가 설정한 자격 증명으로 운영자를 생성합니다:

```
POST /v1/admin/operators
{
  "email": "operator@company.com",
  "name": "John Smith",
  "password": "SecureP@ss123",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "DIRECT"
}
```

### 이메일 초대

운영자가 직접 비밀번호를 설정하도록 초대 이메일을 보냅니다:

```
POST /v1/admin/operators/invite
{
  "email": "operator@company.com",
  "name": "John Smith",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "invitationType": "EMAIL"
}
```

운영자는 등록을 완료하고 비밀번호를 설정하기 위한 링크를 받습니다.

## 운영자 인증

운영자는 전용 엔드포인트를 통해 로그인합니다:

```
POST /v1/operator/auth/login
{
  "email": "operator@company.com",
  "password": "SecureP@ss123",
  "serviceSlug": "resume"
}
```

## CRUD 연산

| 연산   | 엔드포인트                                   | 설명                      |
| ------ | -------------------------------------------- | ------------------------- |
| List   | `GET /v1/admin/operators?serviceSlug=resume` | 서비스의 운영자 목록 조회 |
| Get    | `GET /v1/admin/operators/{id}`               | 운영자 상세 정보 조회     |
| Update | `PATCH /v1/admin/operators/{id}`             | 운영자 정보 업데이트      |
| Delete | `DELETE /v1/admin/operators/{id}`            | 운영자 소프트 삭제        |

## 권한 관리

### 권한 부여

```
POST /v1/admin/operators/{id}/permissions
{
  "permissions": ["user:read", "resume:read", "resume:update"]
}
```

### 사용 가능한 권한

| 권한               | 설명                       |
| ------------------ | -------------------------- |
| user:read          | 범위 내 사용자 프로필 조회 |
| resume:read        | 이력서 내용 조회           |
| resume:update      | 이력서 내용 편집           |
| personal_info:read | 개인 정보 조회             |
| consent:read       | 사용자 동의 상태 조회      |

## 접근 제어

### 운영자가 할 수 있는 일

- 할당된 서비스와 국가 내의 사용자 조회
- 부여된 권한에 따라 동작 수행
- 운영자 전용 대시보드 접근

### 운영자가 할 수 없는 일

- 범위를 벗어난 다른 서비스 접근
- 다른 운영자 관리
- 관리자 수준 API 접근
- 다른 국가의 사용자 조회

## 토큰 구조

운영자 토큰은 범위가 지정된 클레임을 포함합니다:

```json
{
  "sub": "operator-uuid",
  "type": "OPERATOR_ACCESS",
  "serviceSlug": "resume",
  "countryCode": "KR",
  "permissions": ["user:read", "resume:read"]
}
```

## 오류 처리

| 오류              | 원인                     | 해결책                                                    |
| ----------------- | ------------------------ | --------------------------------------------------------- |
| Invalid service   | 서비스가 존재하지 않음   | `GET /v1/services`를 통해 서비스 존재 여부를 확인하십시오 |
| Permission denied | 권한이 부족함            | 관리자가 API를 통해 권한을 부여합니다                     |
| Inactive operator | 운영자 계정이 비활성화됨 | `PATCH {id} {"isActive": true}`를 통해 재활성화합니다     |

## 모범 사례

1. **최소 권한 원칙**: 필요한 권한만 부여합니다
2. **정기 감사**: 운영자 접근 권한을 주기적으로 검토합니다
3. **이메일 초대 사용**: 직접 비밀번호 설정보다 이메일 초대를 선호합니다
4. **접근 기록**: 운영자가 특정 권한을 필요로 하는 이유를 기록합니다
5. **즉시 비활성화**: 접근이 더 이상 필요 없을 때 즉시 운영자를 비활성화합니다

---

**LLM Reference**: `docs/llm/guides/OPERATOR_MANAGEMENT.md`
