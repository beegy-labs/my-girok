# Object Storage - 2026 Best Practices

> MinIO/S3 compatible storage, file uploads, security | **Researched**: 2026-01-22

## Important Notice (2026)

> **MinIO Community Edition** entered maintenance mode in late 2025. Consider alternatives for new projects:
>
> - **Garage** (AGPLv3) - Lightweight, geo-distributed
> - **SeaweedFS** (Apache 2.0) - Scalable, fast
> - **RustFS** (Apache 2.0) - Modern, Rust-based

Existing MinIO deployments remain supported. This guide covers S3-compatible patterns applicable to any provider.

## S3 Client Setup

### Node.js with AWS SDK v3

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT, // MinIO or S3 endpoint
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

export { s3Client };
```

### MinIO Client (Alternative)

```typescript
import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000,
  useSSL: process.env.NODE_ENV === 'production',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

export { minioClient };
```

## File Upload Patterns

### Direct Upload (Small Files)

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createId } from '@paralleldrive/cuid2';

interface UploadResult {
  key: string;
  url: string;
  size: number;
}

async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  bucket: string = 'uploads',
): Promise<UploadResult> {
  const key = `${Date.now()}-${createId()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'original-name': filename,
      },
    }),
  );

  return {
    key,
    url: `${process.env.S3_ENDPOINT}/${bucket}/${key}`,
    size: buffer.length,
  };
}
```

### Presigned URL Upload (Large Files)

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface PresignedUpload {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  maxSize: number = 50 * 1024 * 1024, // 50MB
): Promise<PresignedUpload> {
  const key = `uploads/${Date.now()}-${createId()}-${filename}`;
  const expiresIn = 3600; // 1 hour

  const command = new PutObjectCommand({
    Bucket: 'user-uploads',
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, key, expiresIn };
}
```

### Multipart Upload (Very Large Files)

```typescript
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';

async function multipartUpload(key: string, bucket: string, parts: Buffer[]): Promise<void> {
  // Initialize multipart upload
  const { UploadId } = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  try {
    // Upload parts
    const uploadedParts = await Promise.all(
      parts.map(async (part, index) => {
        const { ETag } = await s3Client.send(
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId,
            PartNumber: index + 1,
            Body: part,
          }),
        );
        return { PartNumber: index + 1, ETag };
      }),
    );

    // Complete upload
    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId,
        MultipartUpload: { Parts: uploadedParts },
      }),
    );
  } catch (error) {
    // Abort on failure
    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId,
      }),
    );
    throw error;
  }
}
```

## NestJS Integration

### Upload Module

```typescript
// upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
    }),
  ],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
```

### Upload Controller

```typescript
// upload/upload.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<UploadResponse> {
    // Validate
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Process image (resize, optimize)
    const processed = await this.uploadService.processImage(file.buffer);

    // Upload to S3
    const result = await this.uploadService.upload(processed, file.originalname, 'image/webp');

    return result;
  }
}
```

## Image Processing

### Sharp Integration

```typescript
import sharp from 'sharp';

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

async function processImage(
  input: Buffer,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
): Promise<ProcessedImage> {
  const image = sharp(input);
  const metadata = await image.metadata();

  const processed = await image
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    buffer: processed,
    width: Math.min(metadata.width || maxWidth, maxWidth),
    height: Math.min(metadata.height || maxHeight, maxHeight),
    format: 'webp',
  };
}

// Generate thumbnails
async function generateThumbnails(input: Buffer): Promise<Map<string, Buffer>> {
  const sizes = [
    { name: 'thumb', width: 150, height: 150 },
    { name: 'small', width: 320, height: 240 },
    { name: 'medium', width: 640, height: 480 },
  ];

  const thumbnails = new Map<string, Buffer>();

  for (const size of sizes) {
    const thumb = await sharp(input)
      .resize(size.width, size.height, { fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer();

    thumbnails.set(size.name, thumb);
  }

  return thumbnails;
}
```

## Security Best Practices

### Bucket Policies

```typescript
// Private bucket - no public access
const privateBucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Deny',
      Principal: '*',
      Action: 's3:*',
      Resource: ['arn:aws:s3:::private-bucket/*'],
      Condition: {
        Bool: { 'aws:SecureTransport': 'false' },
      },
    },
  ],
};

// Public read bucket (for static assets)
const publicReadPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: ['arn:aws:s3:::public-assets/*'],
    },
  ],
};
```

### Access Control

```typescript
// Generate time-limited download URL
async function getDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: 'private-bucket',
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });
}
```

### File Validation

```typescript
import fileType from 'file-type';

async function validateFile(buffer: Buffer): Promise<void> {
  // Check magic bytes
  const type = await fileType.fromBuffer(buffer);

  if (!type) {
    throw new Error('Unable to determine file type');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  if (!allowedTypes.includes(type.mime)) {
    throw new Error(`File type ${type.mime} not allowed`);
  }

  // Additional checks
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error('File too large (max 50MB)');
  }
}
```

## Bucket Organization

```
buckets/
├── user-uploads/        # User-generated content
│   └── {userId}/{year}/{month}/{filename}
├── public-assets/       # CDN-served static files
│   └── {assetType}/{filename}
├── private-documents/   # Sensitive files
│   └── {userId}/{docType}/{filename}
└── temp-uploads/        # Presigned upload destination
    └── {uploadId}/{filename}
```

## Anti-Patterns

| Don't                | Do                  | Reason         |
| -------------------- | ------------------- | -------------- |
| Trust file extension | Check magic bytes   | Security       |
| Store in DB          | Store path/key only | Performance    |
| Skip size limits     | Enforce limits      | DoS prevention |
| Public buckets       | Presigned URLs      | Access control |
| Flat structure       | Organized paths     | Manageability  |

## Sources

- [MinIO Best Practices](https://blog.min.io/s3-security-access-control/)
- [MinIO GitHub Repository](https://github.com/minio/minio)
- [S3-Compatible Providers 2026](https://cloudian.com/guides/s3-storage/best-s3-compatible-storage-providers-top-5-options-in-2026/)
- [Securing MinIO in Production](https://medium.com/@nafiul.hafiz97/best-practices-to-secure-minio-object-storage-in-production-1d6e015a6405)
- [MinIO Status Update](https://www.infoq.com/news/2025/12/minio-s3-api-alternatives/)
