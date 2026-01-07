# Performance

## API Targets (p95)

| Type             | Target |
| ---------------- | ------ |
| GET by ID        | <50ms  |
| List (paginated) | <200ms |
| Complex queries  | <500ms |
| Mutations        | <300ms |

## Frontend Targets

| Metric | Target |
| ------ | ------ |
| FCP    | <1.5s  |
| LCP    | <2.5s  |
| TTI    | <3.5s  |
| CLS    | <0.1   |

## Database

### Indexing

```prisma
model Post {
  @@index([authorId])
  @@index([status, createdAt(sort: Desc)])
}
```

### N+1 Fix

```typescript
// BAD
for (const post of posts) { post.author = await prisma.user.findUnique(...); }

// GOOD
const posts = await prisma.post.findMany({ include: { author: true } });
```

### Pagination

```typescript
const posts = await prisma.post.findMany({ take: 20, cursor: { id: lastPostId } });
```

## Cache TTL

| Data         | TTL  |
| ------------ | ---- |
| User profile | 5min |
| Post detail  | 5min |
| Post list    | 1min |
| Static       | 1h   |

## React

### Memoization

```typescript
const handleSubmit = useCallback(() => {...}, [deps]);
const filtered = useMemo(() => items.filter(...), [items]);
const Item = React.memo(({ data }) => <div>{data}</div>);
```

### Navigation

```typescript
// BAD: state-based
const [nav, setNav] = useState(null);
useEffect(() => {
  if (nav) navigate(nav);
}, [nav]);

// GOOD: direct
const handleSubmit = async () => {
  await save();
  navigate('/next');
};
```

## Monitoring

| Metric      | Threshold |
| ----------- | --------- |
| Slow query  | >1s log   |
| Error rate  | >1% alert |
| p95 latency | >1s alert |
