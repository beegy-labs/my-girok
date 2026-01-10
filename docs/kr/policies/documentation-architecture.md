# 문서 아키텍처

> LLM 최적화를 위한 4계층 구조를 갖춘 SSOT 문서 전략

## 개요

my-girok 프로젝트는 인간 가독성과 AI 어시스턴트 토큰 효율성을 모두 최적화하도록 설계된 4계층 문서 아키텍처를 사용합니다.

## 4계층 문서 구조

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

### 계층 분해

| Tier | Path        | Type     | Editable | Format             | Purpose                  |
| ---- | ----------- | -------- | -------- | ------------------ | ------------------------ |
| 1    | `.ai/`      | 포인터   | **Yes**  | 테이블, 링크       | LLM 빠른 탐색            |
| 2    | `docs/llm/` | **SSOT** | **Yes**  | YAML, 테이블, 코드 | 진실의 원천              |
| 3    | `docs/en/`  | 생성됨   | **No**   | 문학, 예시         | 인간이 읽을 수 있는 문서 |
| 4    | `docs/kr/`  | 번역됨   | **No**   | en/와 동일         | 한국어 현지화            |

## 편집 규칙

### 편집 가능한 항목

- `.ai/` - 빠른 포인터 및 탐색을 위해 직접 편집이 허용됩니다.
- `docs/llm/` - 직접 편집이 허용됩니다 (이것이 SSOT입니다).

### 편집 불가 항목

- `docs/en/` - docs/llm에서 자동 생성됩니다.
- `docs/kr/` - docs/en에서 자동 번역됩니다.

### 이것이 중요한 이유

`docs/en/` 또는 `docs/kr/`를 직접 편집하면 다음과 같은 결과가 발생합니다:

1. 다음 생성 시 변경 사항이 덮어써집니다.
2. SSOT와 생성된 문서 간 불일치가 발생합니다.
3. 언어 간 번역 이탈이 발생합니다.

## 생성 워크플로우

### 1단계: SSOT 편집

```bash
# LLM-최적화 소스 편집
vim docs/llm/services/auth-service.md
```

### 2단계: 영어 문서 생성

```bash
pnpm docs:generate
# 변환: docs/llm/ → docs/en/
```

### 3단계: 한국어 번역

```bash
pnpm docs:translate --locale kr
# 변환: docs/en/ → docs/kr/
```

### 4단계: 모든 변경 사항 커밋

```bash
git add docs/
git commit -m "docs: update auth-service documentation"
```

## 지원되는 공급자

| 작업 | 입력      | 출력     | 지원되는 공급자        |
| ---- | --------- | -------- | ---------------------- |
| 생성 | docs/llm/ | docs/en/ | Gemini, Claude, OpenAI |
| 번역 | docs/en/  | docs/kr/ | Ollama, Gemini         |

### 공급자 선택

```bash
# 기본 공급자 사용
pnpm docs:generate

# 번역에 특정 공급자 사용
pnpm docs:translate --provider gemini
```

## 형식 가이드라인

### .ai/ 디렉터리 (포인터 문서)

```yaml
max_lines: 50
allowed_content:
  - markdown tables
  - links to other docs
not_allowed:
  - long prose
  - detailed examples
  - code blocks over 10 lines
purpose: Quick navigation for LLM assistants
```

### docs/llm/ 디렉터리 (SSOT)

```yaml
optimization: token_efficiency
human_readable: false
allowed_content:
  - YAML blocks
  - markdown tables
  - code blocks
  - bullet lists
prose: minimal (only when absolutely necessary)
```

### docs/en/ 디렉터리 (생성됨)

```yaml
optimization: human_readable
source: docs/llm/
editable: false
allowed_content:
  - explanatory prose
  - detailed examples
  - step-by-step guides
  - full code samples
```

## 업데이트 요구사항

| 변경 유형              | .ai/ 업데이트          | docs/llm/ 업데이트   |
| ---------------------- | ---------------------- | -------------------- |
| New component/hook     | `apps/` or `packages/` | -                    |
| New API endpoint       | `services/`            | `services/`          |
| New pattern/convention | `rules.md`             | -                    |
| Major feature          | relevant file          | `guides/`            |
| New policy             | `rules.md` summary     | `policies/` full doc |

## AI 어시스턴트 진입점

| AI 어시스턴트 | 진입 파일   | 첫 번째 읽을 파일 |
| ------------- | ----------- | ----------------- |
| Claude        | `CLAUDE.md` | `.ai/rules.md`    |
| Gemini        | `GEMINI.md` | `.ai/rules.md`    |

두 진입 파일 모두 AI 어시스턴트가 4계층 구조를 이해하도록 전체 문서 정책을 포함합니다.

## 디렉터리 구조

```
my-girok/
├── CLAUDE.md           # Claude AI 진입점
├── GEMINI.md           # Gemini AI 진입점
│
├── .ai/                # 편집 가능 - LLM 포인터 (각 파일 50줄 이하)
│   ├── README.md       # 탐색 가이드
│   ├── rules.md        # 핵심 규칙
│   ├── services/       # 서비스 포인터
│   ├── packages/       # 패키지 포인터
│   └── apps/           # 앱 포인터
│
├── docs/
│   ├── llm/            # 편집 가능 - SSOT (토큰 최적화)
│   │   ├── policies/   # 정책 정의
│   │   ├── services/   # 서비스 문서
│   │   ├── guides/     # 기술 가이드
│   │   └── packages/   # 패키지 문서
│   │
│   ├── en/             # 편집 불가 - 생성됨 (인간 가독성)
│   │   ├── policies/   # 상세 정책
│   │   ├── services/   # 서비스 문서
│   │   ├── guides/     # 튜토리얼
│   │   └── packages/   # 패키지 문서
│   │
│   └── kr/             # 편집 불가 - 번역됨
```

## 최고의 실천

1. 항상 SSOT를 먼저 편집하세요: `docs/llm/`에서 변경한 뒤 재생성을 수행합니다.
2. 변경 후 생성 단계를 실행하세요: 생성 단계를 건너뛰지 마세요.
3. .ai/를 간결하게 유지하세요: 파일당 최대 50줄.
4. LLM 문서에서 테이블을 사용하세요: 테이블은 토큰 효율적입니다.
5. SSOT에서는 최소한의 문학을 사용하세요: 자세한 설명은 생성된 문서에 남겨둡니다.

LLM 참조: `docs/llm/policies/documentation-architecture.md`
