# Rybbit Session Replay & Analytics Features Reference

> 참조 목적 문서 - 구현 시 재검색 방지용

## 개요

Rybbit은 오픈소스 프라이버시 중심 웹 분석 플랫폼으로, Google Analytics 대안으로 사용됨.

- 기반: rrweb (오픈소스 세션 리플레이 라이브러리)
- 특징: 쿠키 없음, GDPR/CCPA 준수, 셀프 호스팅 가능

## 1. Session Replay 기능

### 1.1 Core Features

| 기능                 | 설명                        | 우선순위 |
| -------------------- | --------------------------- | -------- |
| Pixel-perfect Replay | DOM 기반 완벽한 세션 재생   | **필수** |
| Timeline Controls    | 재생/일시정지/탐색/속도조절 | **필수** |
| Skip Inactivity      | 비활성 구간 자동 스킵       | 선택     |
| Event Markers        | 타임라인에 이벤트 표시      | **필수** |

### 1.2 Privacy Controls

| 기능              | 설명                          | 우선순위 |
| ----------------- | ----------------------------- | -------- |
| maskAllInputs     | 모든 입력값 마스킹 (**\***)   | **필수** |
| maskTextSelectors | 특정 요소 텍스트 마스킹       | 선택     |
| blockSelectors    | 특정 요소 완전 제외           | 선택     |
| ignoreSelectors   | 요소 표시하되 상호작용 미기록 | 선택     |

### 1.3 SDK Controls

```javascript
rybbit.startSessionReplay(); // 녹화 시작
rybbit.stopSessionReplay(); // 녹화 중지
rybbit.isSessionReplayActive(); // 상태 확인
```

## 2. Session List Table

### 2.1 표시 컬럼

| 컬럼        | 설명                             | 우선순위 |
| ----------- | -------------------------------- | -------- |
| User        | 익명 식별자 (예: "Aqua Meerkat") | **필수** |
| Country     | 국가 + 플래그 아이콘             | **필수** |
| Device Type | Desktop/Tablet/Mobile 아이콘     | **필수** |
| Browser     | Chrome/Safari/Firefox + OS       | **필수** |
| Duration    | 세션 길이                        | **필수** |
| Pages       | 방문 페이지 수                   | **필수** |
| Entry Page  | 진입 페이지                      | 선택     |
| Referrer    | 유입 경로                        | 선택     |
| Date/Time   | 세션 시간                        | **필수** |
| Status      | 녹화 상태 (Active/Ended)         | **필수** |

### 2.2 필터링

| 필터        | 설명                | 우선순위 |
| ----------- | ------------------- | -------- |
| Date Range  | 날짜 범위           | **필수** |
| Device Type | 기기 유형           | **필수** |
| Country     | 국가                | 선택     |
| Browser     | 브라우저            | 선택     |
| Duration    | 세션 길이 (min/max) | 선택     |

## 3. Session Detail View

### 3.1 메타데이터

| 항목           | 설명                    |
| -------------- | ----------------------- |
| Session ID     | 고유 식별자             |
| User ID        | 사용자 식별자 (익명)    |
| Actor Type     | USER / ADMIN / OPERATOR |
| Start/End Time | 시작/종료 시간          |
| Duration       | 총 세션 길이            |
| Device Info    | 브라우저, OS, 화면 크기 |
| Location       | 국가, 지역, 도시        |

### 3.2 이벤트 타임라인

| 이벤트 유형  | 아이콘      | 설명          |
| ------------ | ----------- | ------------- |
| Page View    | 👁️ Eye      | 페이지 조회   |
| Click        | 👆 Pointer  | 클릭 이벤트   |
| Input        | ⌨️ Keyboard | 입력 이벤트   |
| Scroll       | 📜 Scroll   | 스크롤 이벤트 |
| Custom Event | ⭐ Star     | 커스텀 이벤트 |
| Error        | ❌ X        | 에러 발생     |

### 3.3 이벤트 상세

```
[1] 14:22:05 - Page View
    Path: /dashboard
    Title: Dashboard | My-Girok

[2] 14:22:12 - Click
    Element: button.submit-btn
    Text: "Submit"

[3] 14:22:15 - Custom Event
    Name: form_submitted
    Properties: { formId: "login", success: true }
```

## 4. Session Player UI

### 4.1 컨트롤 바

- Play/Pause 버튼
- Progress Bar (클릭으로 탐색)
- Current Time / Total Duration
- Speed Control (0.5x, 1x, 2x, 4x)
- Fullscreen Toggle
- Skip Inactivity Toggle

### 4.2 사이드 패널

- Event List (클릭 시 해당 시점으로 이동)
- Session Metadata
- Console Logs (선택)
- Network Requests (선택)

## 5. Analytics Dashboard (참고용)

### 5.1 Overview Metrics

| 메트릭         | 설명             |
| -------------- | ---------------- |
| Total Sessions | 총 세션 수       |
| Avg. Duration  | 평균 세션 길이   |
| Pages/Session  | 세션당 페이지 수 |
| Bounce Rate    | 이탈률           |

### 5.2 Breakdown Charts

- Sessions by Country (지도/바 차트)
- Sessions by Device Type (파이 차트)
- Sessions by Browser (바 차트)
- Sessions over Time (라인 차트)

## 6. 기술 스택

### 6.1 Recording (클라이언트)

- **rrweb**: DOM 스냅샷 및 이벤트 기록
- **rrweb-snapshot**: DOM 직렬화
- 압축: LZ-string 또는 gzip

### 6.2 Playback (플레이어)

- **rrweb-player**: React 컴포넌트
- 타임라인 렌더링
- 이벤트 동기화

### 6.3 Storage

- Events: JSON (압축)
- Metadata: PostgreSQL/ClickHouse
- 보존 기간: 기본 30일

---

## 참고 자료

- [Rybbit Official](https://rybbit.com/)
- [Rybbit GitHub](https://github.com/rybbit-io/rybbit)
- [rrweb Documentation](https://www.rrweb.io/)
- [rrweb GitHub](https://github.com/rrweb-io/rrweb)
