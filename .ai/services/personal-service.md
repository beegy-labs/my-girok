# Personal Service

> Resume and profile management with PostgreSQL

## Purpose

Manages user resumes, profiles, and share links. Primary service for the resume builder feature. Uses PostgreSQL for complex queries and relational data.

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL 16 + Prisma 6
- **Storage**: MinIO (files)
- **Protocol**: REST (current) + gRPC (planned)
- **Queue**: BullMQ (PDF generation)

## Database Schema (Prisma)

```prisma
// prisma/schema.prisma
model Resume {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  isDefault   Boolean  @default(false)
  paperSize   PaperSize @default(A4)

  // Personal info
  name        String
  email       String?
  phone       String?
  address     String?
  summary     String?
  profilePhotoUrl String?

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  experiences Experience[]
  educations  Education[]
  skills      Skill[]
  certificates Certificate[]
  shareLinks  ShareLink[]

  @@index([userId])
}

model Experience {
  id          String   @id @default(cuid())
  resumeId    String
  resume      Resume   @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  company     String
  position    String
  location    String?
  startDate   DateTime
  endDate     DateTime?
  isCurrent   Boolean  @default(false)
  description String?

  // Nested
  projects    Project[]
  achievements String[]

  sortOrder   Int      @default(0)

  @@index([resumeId])
}

model ShareLink {
  id          String   @id @default(cuid())
  resumeId    String
  resume      Resume   @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  token       String   @unique @default(cuid())
  expiresAt   DateTime?
  maxViews    Int?
  viewCount   Int      @default(0)
  lastViewedAt DateTime?

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([token])
  @@index([resumeId])
}

enum PaperSize {
  A4
  LETTER
}
```

## REST API Endpoints

```typescript
// Resume CRUD
GET    /v1/resume              # List user's resumes
GET    /v1/resume/:id          # Get resume by ID
POST   /v1/resume              # Create resume
PUT    /v1/resume/:id          # Update resume
DELETE /v1/resume/:id          # Delete resume

// Default resume
GET    /v1/resume/default      # Get user's default resume
PUT    /v1/resume/:id/default  # Set as default

// Public resume (no auth)
GET    /v1/resume/public/:username  # Get public resume by username

// Share links
GET    /v1/share               # List user's share links
POST   /v1/share               # Create share link
DELETE /v1/share/:id           # Delete share link
GET    /v1/share/public/:token # Access shared resume (no auth, increments view)

// File upload
POST   /v1/resume/:id/photo    # Upload profile photo
POST   /v1/resume/:id/files    # Upload attachments
```

## Controller

```typescript
// src/resume/resume.controller.ts
@Controller('v1/resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  async findAll(@CurrentUser() user: User): Promise<Resume[]> {
    return this.resumeService.findAllByUserId(user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Resume> {
    const resume = await this.resumeService.findById(id);
    if (resume.userId !== user.id) {
      throw new ForbiddenException();
    }
    return resume;
  }

  @Post()
  async create(
    @Body() dto: CreateResumeDto,
    @CurrentUser() user: User,
  ): Promise<Resume> {
    return this.resumeService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto,
    @CurrentUser() user: User,
  ): Promise<Resume> {
    await this.verifyOwnership(id, user.id);
    return this.resumeService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.verifyOwnership(id, user.id);
    return this.resumeService.remove(id);
  }

  @Public()
  @Get('public/:username')
  async getPublicResume(@Param('username') username: string): Promise<Resume> {
    return this.resumeService.findPublicByUsername(username);
  }
}
```

## Service

```typescript
// src/resume/resume.service.ts
@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async findAllByUserId(userId: string): Promise<Resume[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      include: {
        experiences: {
          include: { projects: true },
          orderBy: { sortOrder: 'asc' },
        },
        educations: { orderBy: { sortOrder: 'asc' } },
        skills: { orderBy: { sortOrder: 'asc' } },
        certificates: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findPublicByUsername(username: string): Promise<Resume> {
    // Get user from auth service (via HTTP or gRPC)
    const user = await this.authClient.getUserByUsername(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resume = await this.prisma.resume.findFirst({
      where: {
        userId: user.id,
        isDefault: true,
      },
      include: {
        experiences: { include: { projects: true } },
        educations: true,
        skills: true,
        certificates: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('No public resume');
    }

    return resume;
  }

  @Transactional()
  async create(userId: string, dto: CreateResumeDto): Promise<Resume> {
    // If this is the first resume, make it default
    const existingCount = await this.prisma.resume.count({ where: { userId } });

    return this.prisma.resume.create({
      data: {
        ...dto,
        userId,
        isDefault: existingCount === 0,
      },
    });
  }

  async uploadPhoto(resumeId: string, file: Express.Multer.File): Promise<string> {
    const key = `resumes/${resumeId}/photo/${file.originalname}`;
    const url = await this.minioService.upload(key, file.buffer, file.mimetype);

    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { profilePhotoUrl: url },
    });

    return url;
  }
}
```

## Share Link Service

```typescript
// src/share/share.service.ts
@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async create(resumeId: string, dto: CreateShareLinkDto): Promise<ShareLink> {
    return this.prisma.shareLink.create({
      data: {
        resumeId,
        expiresAt: dto.expiresAt,
        maxViews: dto.maxViews,
      },
    });
  }

  async accessSharedResume(token: string): Promise<Resume> {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        resume: {
          include: {
            experiences: { include: { projects: true } },
            educations: true,
            skills: true,
            certificates: true,
          },
        },
      },
    });

    if (!shareLink || !shareLink.isActive) {
      throw new NotFoundException('Share link not found');
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new GoneException('Share link expired');
    }

    // Check max views
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      throw new GoneException('Share link view limit reached');
    }

    // Increment view count
    await this.prisma.shareLink.update({
      where: { id: shareLink.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return shareLink.resume;
  }
}
```

## gRPC Service (Planned)

```protobuf
// proto/personal.proto
syntax = "proto3";

package personal;

service PersonalService {
  rpc GetResume(GetResumeRequest) returns (Resume);
  rpc GetUserResumes(GetUserResumesRequest) returns (ResumesResponse);
  rpc GetPublicResume(GetPublicResumeRequest) returns (Resume);
  rpc CreateResume(CreateResumeRequest) returns (Resume);
  rpc UpdateResume(UpdateResumeRequest) returns (Resume);
  rpc Health(Empty) returns (HealthResponse);
}
```

## Environment Variables

```bash
PORT=3002
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/personal

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_BUCKET=my-girok-resumes

# Auth Service
AUTH_SERVICE_URL=http://auth-service:3001

# JWT (for validation)
JWT_SECRET=xxx
```

## Integration Points

### Incoming
- **graphql-bff**: Resume CRUD, share links
- **web-main**: Direct REST API (legacy)

### Outgoing
- **auth-service**: User lookup (HTTP/gRPC)
- **MinIO**: File storage

## File Upload (MinIO)

```typescript
// src/storage/minio.service.ts
@Injectable()
export class MinioService {
  private client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      useSSL: true,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(
      process.env.MINIO_BUCKET,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': contentType },
    );

    return `https://s3.girok.dev/${process.env.MINIO_BUCKET}/${key}`;
  }
}
```

## Performance

- **Prisma Select**: Only fetch needed fields
- **Eager Loading**: Include relations in single query
- **Connection Pooling**: PgBouncer for scaling

## Health Check

```typescript
@Get('health')
async healthCheck() {
  await this.prisma.$queryRaw`SELECT 1`;
  return { status: 'ok' };
}
```
