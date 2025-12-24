# Performance Guidelines

## API Response Targets (p95)

| Type             | Target  |
| ---------------- | ------- |
| GET by ID        | < 50ms  |
| List (paginated) | < 200ms |
| Complex queries  | < 500ms |
| Mutations        | < 300ms |

## Frontend Targets

| Metric | Target |
| ------ | ------ |
| FCP    | < 1.5s |
| LCP    | < 2.5s |
| TTI    | < 3.5s |
| CLS    | < 0.1  |

## Database Optimization

### Indexing

```prisma
model Post {
  @@index([authorId])
  @@index([status, createdAt(sort: Desc)])
}
```

### Query Patterns

```typescript
// ❌ N+1 Problem
for (const post of posts) {
  post.author = await prisma.user.findUnique(...);
}

// ✅ Use include
const posts = await prisma.post.findMany({
  include: { author: true },
});
```

### Pagination

```typescript
// ✅ Cursor-based (for large datasets)
const posts = await prisma.post.findMany({
  take: 20,
  cursor: { id: lastPostId },
});
```

## Caching (Redis)

| Data Type      | TTL    |
| -------------- | ------ |
| User profile   | 5 min  |
| Post detail    | 5 min  |
| Post list      | 1 min  |
| Static content | 1 hour |

## React Optimization

### Memoization (MANDATORY)

```typescript
// Handlers
const handleSubmit = useCallback(() => {...}, [deps]);

// Derived data
const filtered = useMemo(() => items.filter(...), [items]);

// List items
const Item = React.memo(({ data }) => <div>{data}</div>);
```

### Navigation (React Router v7)

```typescript
// ❌ State-based navigation
const [nav, setNav] = useState(null);
useEffect(() => {
  if (nav) navigate(nav);
}, [nav]);

// ✅ Direct navigation
const handleSubmit = async () => {
  await save();
  navigate('/next');
};
```

## Monitoring

- **Slow query**: Log if > 1s
- **Error rate**: Alert if > 1%
- **p95 latency**: Alert if > 1s

---

**Tools**: Lighthouse, React DevTools, EXPLAIN ANALYZE
