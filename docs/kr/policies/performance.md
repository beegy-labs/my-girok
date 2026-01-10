# 성능 정책

> API 지연 목표, 데이터베이스 최적화 및 프론트엔드 성능

## API 응답 시간 목표 (p95)

| 작업 유형            | 목표   |
| -------------------- | ------ |
| ID로 조회            | <50ms  |
| 목록 (페이징)        | <200ms |
| 복잡한 쿼리          | <500ms |
| 변경 (생성/업데이트) | <300ms |

## 프론트엔드 성능 목표

| 지표                           | 목표  | 설명                                 |
| ------------------------------ | ----- | ------------------------------------ |
| FCP (First Contentful Paint)   | <1.5s | 첫 번째 콘텐츠가 보이는 시점         |
| LCP (Largest Contentful Paint) | <2.5s | 주요 콘텐츠가 보이는 시점            |
| TTI (Time to Interactive)      | <3.5s | 페이지가 완전히 상호작용 가능한 시점 |
| CLS (Cumulative Layout Shift)  | <0.1  | 시각적 안정성 지표                   |

## 데이터베이스 최적화

### 인덱싱 전략

```prisma
model Post {
  id        String   @id
  authorId  String
  status    String
  createdAt DateTime

  @@index([authorId])
  @@index([status, createdAt(sort: Desc)])
}
```

### N+1 쿼리 방지

```typescript
// BAD: N+1 문제
for (const post of posts) {
  post.author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// GOOD: include를 사용한 단일 쿼리
const posts = await prisma.post.findMany({
  include: { author: true },
});
```

### 커서 기반 페이징

```typescript
// 대용량 데이터셋에 대한 효율적인 페이징
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1, // 커서를 건너뜀
  cursor: { id: lastPostId },
  orderBy: { createdAt: 'desc' },
});
```

## 캐시 TTL 가이드라인

| 데이터 유형   | TTL  | 근거                      |
| ------------- | ---- | ------------------------- |
| User profile  | 5min | 신선도와 부하의 균형      |
| Post detail   | 5min | 중간 정도의 업데이트 빈도 |
| Post list     | 1min | 자주 변하는 데이터        |
| Static config | 1h   | 거의 변하지 않는 설정     |

## React 성능 최적화 모범 사례

### 메모이제이션

```typescript
// 이벤트 핸들러 메모이제이션
const handleSubmit = useCallback(() => {
  // 핸들러 로직
}, [dependencies]);

// 계산된 값 메모이제이션
const filtered = useMemo(() =>
  items.filter(item => item.active),
  [items]
);

// 컴포넌트 메모이제이션
const Item = React.memo(({ data }) => (
  <div>{data.name}</div>
));
```

### 직접 네비게이션 패턴

```typescript
// BAD: 상태 기반 네비게이션은 불필요한 렌더링을 유발
const [navigateTo, setNavigateTo] = useState(null);
useEffect(() => {
  if (navigateTo) navigate(navigateTo);
}, [navigateTo]);

// GOOD: 비동기 작업 후 직접 네비게이션
const handleSubmit = async () => {
  await saveData();
  navigate('/next');
};
```

## 모니터링 임계값

| 지표        | 로그 임계값 | 알림 임계값 |
| ----------- | ----------- | ----------- |
| Slow query  | >1s         | -           |
| Error rate  | -           | >1%         |
| p95 latency | -           | >1s         |

---

**LLM 참조**: `docs/llm/policies/PERFORMANCE.md`
