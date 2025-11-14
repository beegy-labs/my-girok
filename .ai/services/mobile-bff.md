# Mobile BFF (Backend-for-Frontend)

> Mobile-optimized API aggregation layer

## Purpose

Provides lightweight REST API optimized for mobile apps (iOS/Android). Minimizes payload size and reduces network requests.

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.7
- **Protocol**: REST (primary), GraphQL (optional)
- **Cache**: Redis for mobile-optimized responses

## API Endpoints

### REST API (`/api`)

```typescript
// Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
GET  /api/auth/profile

// Home Feed (optimized aggregation)
GET  /api/home                  # Profile + recent posts + stats

// Posts (minimal payload)
GET  /api/posts                 # List with minimal fields
GET  /api/posts/:id             # Full post details

// Sync (delta updates)
GET  /api/sync?since=timestamp  # Only updated data since timestamp
```

## Key Flows

### Home Feed (Mobile-Optimized)

```typescript
async getHomeFeed(userId: string): Promise<MobileHomeFeed> {
  const cacheKey = `mobile:home:${userId}`;

  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  // Parallel calls
  const [user, posts, stats] = await Promise.all([
    this.authClient.getUser(userId),
    this.contentClient.getPosts({ authorId: userId, limit: 10 }),
    this.contentClient.getStats(userId),
  ]);

  // Mobile-optimized response (minimal fields)
  const feed = {
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar, // thumbnail size
    },
    posts: posts.data.map(p => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt?.substring(0, 100), // truncate
      thumbnail: p.coverImage, // mobile size
      createdAt: p.createdAt,
    })),
    stats: {
      posts: stats.totalPosts,
      notes: stats.totalNotes,
    },
  };

  // Cache for 1 minute
  await this.cache.set(cacheKey, feed, 60);

  return feed;
}
```

### Delta Sync

```typescript
async sync(userId: string, since: Date): Promise<SyncData> {
  // Fetch only updated data since timestamp
  const [updatedPosts, updatedNotes] = await Promise.all([
    this.contentClient.getPosts({
      authorId: userId,
      updatedAfter: since,
    }),
    this.contentClient.getNotes({
      userId,
      updatedAfter: since,
    }),
  ]);

  return {
    posts: updatedPosts,
    notes: updatedNotes,
    syncedAt: new Date(),
  };
}
```

## Mobile-Specific Features

### Payload Optimization

```typescript
// Remove unnecessary fields for list views
interface MobilePostListItem {
  id: string;
  title: string;
  excerpt: string;      // Max 100 chars
  thumbnail?: string;   // Small size
  createdAt: Date;
  // Omit: full content, author details, tags
}

// Full details only when needed
interface MobilePostDetail extends MobilePostListItem {
  content: string;
  author: { id: string; name: string };
  tags: string[];
}
```

### Image Optimization

```typescript
async getOptimizedImage(url: string, type: 'thumbnail' | 'medium'): Promise<string> {
  const sizes = {
    thumbnail: '150x150',
    medium: '800x600',
  };

  return `${url}?size=${sizes[type]}&format=webp`;
}
```

### Push Notifications

```typescript
@Post('notifications/register')
async registerDevice(@Body() dto: RegisterDeviceDto) {
  await this.notificationService.registerDevice({
    userId: dto.userId,
    deviceToken: dto.token,
    platform: dto.platform, // ios or android
  });
}
```

## Integration Points

### Outgoing (This BFF calls)
- **auth-service**: User authentication
- **content-api**: Posts, notes
- **llm-api**: Optional AI features

### Incoming (Clients call this BFF)
- **iOS app**: Swift/SwiftUI
- **Android app**: Kotlin

## Environment Variables

```bash
AUTH_SERVICE_URL=http://auth-service:3000
CONTENT_SERVICE_URL=http://content-api:3000
REDIS_URL=redis://redis:6379
FCM_SERVER_KEY=firebase-cloud-messaging-key
APNS_KEY=apple-push-notification-key
```

## Performance

- Minimize payload size (only essential fields)
- Cache aggressively (1-5 min TTL)
- Support delta sync (reduce data transfer)
- Compress responses (gzip)
- Image optimization (WebP, responsive sizes)

## Security

- Token validation
- Device fingerprinting
- Rate limiting: 500 req/min per device
- Secure token storage (Keychain/EncryptedSharedPreferences)
