# SEO 가이드

> 개인정보 우선 SEO 전략 및 제어된 콘텐츠 색인화

## 핵심 정책

**개인정보 우선 접근**: 공개 이력서 페이지가 없습니다. 모든 이력서는 비공개이며 검색 엔진에 색인되지 않는 토큰 기반 링크를 통해서만 공유됩니다.

## SEO 목표

1. **플랫폼 가시성 극대화**: 홈페이지 및 마케팅 페이지로 유기적 트래픽 유도
2. **사용자 개인정보 보호**: 이력서가 검색 엔진에 절대 색인되지 않도록 보장
3. **제어된 공유**: 만료되고 크롤링 불가능한 `/shared/:token` 링크 사용

## URL 색인 정책

| 경로               | SEO    | 사이트맵에 포함 | robots.txt   |
| ------------------ | ------ | --------------- | ------------ |
| `/`                | Yes    | Yes             | Allow        |
| `/login`           | No     | No              | Disallow     |
| `/register`        | No     | No              | Disallow     |
| `/change-password` | No     | No              | Disallow     |
| `/resume/*`        | **NO** | **NO**          | **Disallow** |
| `/shared/:token`   | No     | No              | Disallow     |
| `/api/*`           | No     | No              | Disallow     |

## robots.txt 설정

위치: `apps/web-main/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /login
Disallow: /register
Disallow: /change-password
Disallow: /resume/
Disallow: /shared/
Disallow: /api/
```

## sitemap.xml 설정

위치: `apps/web-main/public/sitemap.xml`

홈페이지만 포함, 우선순위 1.0. 모든 이력서 관련 페이지는 제외됩니다.

## 메타 태그 구현

### SEO 컴포넌트

위치: `apps/web-main/src/components/SEO.tsx`

```tsx
<SEO
  title="Page Title"
  description="Page description for search results"
  keywords={['keyword1', 'keyword2']}
  url="https://www.mygirok.com/page"
  type="profile"
  structuredData={schema}
/>
```

### 기능

- 동적 타이틀 및 설명
- 소셜 공유용 Open Graph 태그
- 트위터 카드 지원
- 정규화 URL 관리
- 로봇 지시문
- JSON-LD 구조화 데이터

## 구조화 데이터

위치: `apps/web-main/src/utils/structuredData.ts`

| Schema Type        | Use Case                                               |
| ------------------ | ------------------------------------------------------ |
| WebSite            | 홈페이지 검색 기능 포함                                |
| Organization       | 회사 정보                                              |
| Person/ProfilePage | 사용 가능하지만 사용되지 않음 (이력서는 색인되지 않음) |

## 모범 사례

### 콘텐츠 최적화

- 각 페이지에 고유한 타이틀
- 메타 설명: 150-160자
- 적절한 헤딩 계층 구조 (H1-H6)
- 이미지에 대한 설명적 대체 텍스트

### 기술 SEO

- 모바일 친화적 디자인 (뷰포트 메타 태그)
- 모든 페이지에서 HTTPS 사용
- 중복 콘텐츠 방지를 위한 정규화 URL
- 유효한 구조화 데이터 (Google 도구로 테스트)

### 소셜 공유

- Open Graph: `og:title`, `og:description`, `og:image`
- 트위터 카드: `summary_large_image` 형식
- 공유 이미지: 1200x630px 권장

## 테스트 명령

```bash
# Verify robots.txt
curl https://www.mygirok.com/robots.txt

# Verify sitemap
curl https://www.mygirok.com/sitemap.xml

# Check meta tags
curl https://www.mygirok.com/ | grep "meta"
```

## 테스트 도구

| 도구                      | 목적                      |
| ------------------------- | ------------------------- |
| Google Search Console     | 검색 성능 모니터링        |
| Google Rich Results Test  | 구조화 데이터 검증        |
| PageSpeed Insights        | Core Web Vitals 확인      |
| Facebook Sharing Debugger | Open Graph 태그 테스트    |
| Twitter Card Validator    | 트위터 카드 렌더링 테스트 |

## 향후 개선 사항

### 마케팅 페이지

새로운 공개 페이지를 추가할 때, 사이트맵에 포함:

- `/about`
- `/features`
- `/pricing`
- `/blog`

### 국제화

- 언어 변형용 hreflang 태그 추가
- 언어별 사이트맵 생성
- 지리 타게팅 구현

### 성능

- 홈페이지용 서버 사이드 렌더링
- 마케팅 페이지용 프리렌더링
- 서비스 워커 캐싱
- Core Web Vitals 최적화

## 모니터링 지표

| 지표               | 도구                  |
| ------------------ | --------------------- |
| Organic Traffic    | Google Analytics      |
| Search Rankings    | Google Search Console |
| Click-Through Rate | Google Search Console |
| Page Load Time     | PageSpeed Insights    |
| Core Web Vitals    | Google Search Console |
| Indexed Pages      | Google Search Console |

**LLM 참조**: `docs/llm/guides/SEO_GUIDE.md`
