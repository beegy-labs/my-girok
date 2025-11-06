# Content API

> Content management microservice (posts, notes, files)

## Purpose

Manages all user-generated content: blog posts, personal notes, and file attachments.

## Tech Stack

- **Framework**: NestJS 10 + TypeScript
- **Database**: PostgreSQL 16 + Prisma 5
- **Cache**: Redis (optional)
- **Protocols**: REST + GraphQL

## API Endpoints

### REST API (`/api/v1`)

```typescript
// Posts
GET    /api/v1/posts              # List posts (paginated)
GET    /api/v1/posts/:id          # Get post by ID
POST   /api/v1/posts              # Create post
PATCH  /api/v1/posts/:id          # Update post
DELETE /api/v1/posts/:id          # Delete post

// Notes
GET    /api/v1/notes              # List notes
GET    /api/v1/notes/:id          # Get note
POST   /api/v1/notes              # Create note
PATCH  /api/v1/notes/:id          # Update note
DELETE /api/v1/notes/:id          # Delete note

// Files
GET    /api/v1/files              # List files
GET    /api/v1/files/:id          # Get file metadata
POST   /api/v1/files/upload       # Upload file
DELETE /api/v1/files/:id          # Delete file

// Tags
GET    /api/v1/tags               # List all tags
POST   /api/v1/tags               # Create tag
POST   /api/v1/posts/:id/tags     # Add tags to post
```

### GraphQL API (`/graphql`)

```graphql
type Query {
  posts(limit: Int, cursor: String): PostConnection!
  post(id: ID!): Post
  notes(limit: Int): [Note!]!
  note(id: ID!): Note
  files(limit: Int): [File!]!
  tags: [Tag!]!
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!

  createNote(input: CreateNoteInput!): Note!
  updateNote(id: ID!, input: UpdateNoteInput!): Note!
  deleteNote(id: ID!): Boolean!

  uploadFile(file: Upload!): File!
  deleteFile(id: ID!): Boolean!
}

type Post {
  id: ID!
  title: String!
  content: String!
  excerpt: String
  slug: String!
  status: PostStatus!
  authorId: String!
  tags: [Tag!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Note {
  id: ID!
  title: String!
  content: String!
  category: String
  tags: [Tag!]!
  createdAt: DateTime!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

## Key Flows

### Create Post with Tags

```typescript
@Transactional()
async createPost(dto: CreatePostDto, userId: string) {
  // 1. Validate DTO
  // 2. Generate slug from title
  const slug = slugify(dto.title);

  // 3. Create post
  const post = await this.postsRepo.create({
    ...dto,
    slug,
    authorId: userId,
  });

  // 4. Connect tags (create if not exist)
  if (dto.tags?.length) {
    await this.tagsRepo.connectToPost(post.id, dto.tags);
  }

  // 5. Invalidate cache
  await this.cache.invalidatePattern('posts:list:*');

  return post;
}
```

### List Posts (Paginated)

```typescript
async findAll(query: ListPostsDto) {
  const cacheKey = `posts:list:${JSON.stringify(query)}`;

  // Check cache
  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  // Cursor pagination
  const posts = await this.prisma.post.findMany({
    take: query.limit || 20,
    skip: query.cursor ? 1 : 0,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    where: {
      status: PostStatus.PUBLISHED,
      authorId: query.authorId,
    },
    include: {
      tags: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const result = {
    data: posts,
    nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null,
  };

  // Cache for 1 minute
  await this.cache.set(cacheKey, result, 60);

  return result;
}
```

### File Upload Flow

```typescript
async uploadFile(file: Express.Multer.File, userId: string) {
  // 1. Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException('Invalid file type');
  }

  // 2. Generate unique filename
  const filename = `${uuid()}-${file.originalname}`;

  // 3. Upload to storage (S3, local, etc.)
  const url = await this.storageService.upload(file.buffer, filename);

  // 4. Save metadata to DB
  const fileRecord = await this.filesRepo.create({
    filename,
    originalName: file.originalname,
    url,
    size: file.size,
    mimeType: file.mimetype,
    userId,
  });

  return fileRecord;
}
```

## Database Schema

```prisma
model Post {
  id        String     @id @default(uuid())
  title     String
  content   String
  excerpt   String?
  slug      String     @unique
  status    PostStatus @default(DRAFT)
  authorId  String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  tags      Tag[]      @relation("PostTags")

  @@index([authorId])
  @@index([status])
  @@index([slug])
  @@index([status, createdAt(sort: Desc)])
}

model Note {
  id        String   @id @default(uuid())
  title     String
  content   String
  category  String?
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tags      Tag[]    @relation("NoteTags")

  @@index([userId])
  @@index([category])
}

model File {
  id           String   @id @default(uuid())
  filename     String
  originalName String
  url          String
  size         Int
  mimeType     String
  userId       String
  createdAt    DateTime @default(now())

  @@index([userId])
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique

  posts Post[] @relation("PostTags")
  notes Note[] @relation("NoteTags")
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

## Integration Points

### Outgoing (This service calls)
- **auth-service**: Validate user tokens (via Gateway)
- **llm-api**: Send content for AI analysis

### Incoming (Other services call)
- **web-bff**: Aggregates content data
- **mobile-bff**: Fetches content for mobile apps
- **api-gateway**: Routes content requests

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@postgres:5432/content_db
REDIS_URL=redis://redis:6379
STORAGE_TYPE=local # or s3
AWS_S3_BUCKET=my-girok-files
```

## Common Patterns

### DTO Validation

```typescript
import { IsString, IsNotEmpty, MaxLength, IsEnum, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
```

### N+1 Prevention

```typescript
// ❌ DON'T
const posts = await prisma.post.findMany();
for (const post of posts) {
  post.tags = await prisma.tag.findMany({ where: { postId: post.id } });
}

// ✅ DO
const posts = await prisma.post.findMany({
  include: { tags: true },
});
```

## Performance

- Cache frequently accessed posts (1 min TTL)
- Use cursor pagination for large datasets
- Index on authorId, status, createdAt
- Use SELECT to fetch only needed fields

## Security

- Validate user owns content before update/delete
- Sanitize HTML content (prevent XSS)
- File upload: validate type, size, scan for viruses
- Rate limit: 10 uploads/min per user
