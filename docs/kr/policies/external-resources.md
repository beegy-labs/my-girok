# 외부 리소스 정책

> 자체 호스팅 리소스만 사용 - 프로덕션에서는 외부 CDN 의존성 금지

## 핵심 규칙

**프로덕션에서는 외부 CDN을 절대 사용하지 마십시오. 모든 리소스는 자체 호스팅되어야 합니다.**

## 왜 자체 호스팅인가?

| 이유          | 이점                     |
| ------------- | ------------------------ |
| 신뢰성        | CDN 다운타임 의존성 없음 |
| 개인정보 보호 | GDPR/CCPA 준수           |
| 성능          | 외부 DNS 조회 없음       |
| 보안          | 공급망 공격 벡터 없음    |
| 오프라인      | PWA 지원                 |

## 자체 호스팅 폰트

| 폰트             | 라이선스 | 위치                                           |
| ---------------- | -------- | ---------------------------------------------- |
| Inter            | OFL 1.1  | packages/design-tokens/fonts/inter/            |
| Playfair Display | OFL 1.1  | packages/design-tokens/fonts/playfair-display/ |
| Pretendard       | OFL 1.1  | packages/design-tokens/fonts/pretendard/       |

### 폰트 사용법

```css
/* Import all tokens including fonts */
@import '@my-girok/design-tokens/tokens.css';

/* Or import specific font */
@import '@my-girok/design-tokens/fonts/inter.css';
```

### PDF 생성

```typescript
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
import PretendardBold from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Bold.otf';
```

## 자체 호스팅 자바스크립트 라이브러리

| 리소스            | 위치                                    |
| ----------------- | --------------------------------------- |
| pdfjs-dist worker | apps/web-main/public/pdf.worker.min.mjs |

## 허용된 외부 서비스

| 서비스           | 도메인               | 이유             |
| ---------------- | -------------------- | ---------------- |
| Rybbit Analytics | rybbit.girok.dev     | 자체 호스팅 분석 |
| API Backend      | my-api-dev.girok.dev | 우리 인프라      |
| OAuth Providers  | Various              | 런타임 요구사항  |

## 새 폰트 추가

### 1. 라이선스 확인

```yaml
allowed:
  - OFL (SIL Open Font License)
  - Apache 2.0
  - MIT

forbidden:
  - Commercial licenses
  - Restricted licenses
```

### 2. 폰트 파일 다운로드

```bash
mkdir -p packages/design-tokens/fonts/<font-name>
curl -L "<font-url>" -o packages/design-tokens/fonts/<font-name>/<weight>.ttf
```

### 3. CSS @font-face 생성

```css
@font-face {
  font-family: '<Font Name>';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./<font-name>/<weight>.ttf') format('truetype');
}
```

### 4. 라이선스 파일 업데이트

`packages/design-tokens/fonts/LICENSE`에 폰트 라이선스 추가

### 5. package.json에 내보내기

```json
{
  "exports": {
    "./fonts/<font-name>.css": "./fonts/<font-name>.css"
  }
}
```

## 마이그레이션 체크리스트

CDN에서 자체 호스팅으로 마이그레이션 시:

- [ ] 필요한 모든 파일 다운로드
- [ ] 라이선스 호환성 확인
- [ ] 적절한 패키지에 추가
- [ ] import 문 업데이트
- [ ] 빌드 프로세스 테스트
- [ ] 콘텐츠 보안 정책 업데이트
- [ ] 모든 CDN URL 제거

## CI 검증

CDN 사용을 감지하기 위해 CI 파이프라인에 추가:

```bash
# Check for Google Fonts CDN
grep -r "fonts.googleapis.com" --include="*.html" --include="*.css"

# Check for common CDNs
grep -rE "(cdn\.|unpkg|jsdelivr|cloudflare)" --include="*.tsx" --include="*.ts"

# Both commands should return empty
```

## OFL 라이선스 준수

| 허용                 | 금지                           |
| -------------------- | ------------------------------ |
| 상업적 사용          | 폰트를 독립 제품으로 판매 금지 |
| 수정                 | -                              |
| 배포                 | -                              |
| 라이선스 포함 (필수) | -                              |

**LLM 참조**: `docs/llm/policies/EXTERNAL_RESOURCES.md`
