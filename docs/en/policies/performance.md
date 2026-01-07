# Performance Policy

> API latency targets, database optimization, and frontend performance

## API Response Time Targets (p95)

| Operation Type            | Target |
| ------------------------- | ------ |
| GET by ID                 | <50ms  |
| List (paginated)          | <200ms |
| Complex queries           | <500ms |
| Mutations (create/update) | <300ms |

## Frontend Performance Targets

| Metric                         | Target | Description            |
| ------------------------------ | ------ | ---------------------- |
| FCP (First Contentful Paint)   | <1.5s  | First content visible  |
| LCP (Largest Contentful Paint) | <2.5s  | Main content visible   |
| TTI (Time to Interactive)      | <3.5s  | Page fully interactive |
| CLS (Cumulative Layout Shift)  | <0.1   | Visual stability       |

## Database Optimization

### Indexing Strategy

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

### Avoiding N+1 Queries

```typescript
// BAD: N+1 problem
for (const post of posts) {
  post.author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// GOOD: Single query with include
const posts = await prisma.post.findMany({
  include: { author: true },
});
```

### Cursor-Based Pagination

```typescript
// Efficient pagination for large datasets
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1, // Skip the cursor
  cursor: { id: lastPostId },
  orderBy: { createdAt: 'desc' },
});
```

## Cache TTL Guidelines

| Data Type     | TTL  | Rationale                 |
| ------------- | ---- | ------------------------- |
| User profile  | 5min | Balance freshness vs load |
| Post detail   | 5min | Moderate update frequency |
| Post list     | 1min | Frequently changing       |
| Static config | 1h   | Rarely changes            |

## React Performance Best Practices

### Memoization

```typescript
// Memoize event handlers
const handleSubmit = useCallback(() => {
  // handler logic
}, [dependencies]);

// Memoize computed values
const filtered = useMemo(() =>
  items.filter(item => item.active),
  [items]
);

// Memoize components
const Item = React.memo(({ data }) => (
  <div>{data.name}</div>
));
```

### Direct Navigation Pattern

```typescript
// BAD: State-based navigation causes extra renders
const [navigateTo, setNavigateTo] = useState(null);
useEffect(() => {
  if (navigateTo) navigate(navigateTo);
}, [navigateTo]);

// GOOD: Direct navigation after async operation
const handleSubmit = async () => {
  await saveData();
  navigate('/next');
};
```

## Monitoring Thresholds

| Metric      | Log Threshold | Alert Threshold |
| ----------- | ------------- | --------------- |
| Slow query  | >1s           | -               |
| Error rate  | -             | >1%             |
| p95 latency | -             | >1s             |

---

**LLM Reference**: `docs/llm/policies/PERFORMANCE.md`
