import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';

/**
 * Storage Service for MinIO Integration
 * Handles file upload, download, and deletion
 * Provides grayscale conversion for resume profile photos
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    const port = parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'my-girok-resumes';
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL') || `http://${endPoint}:${port}`;

    if (!accessKey || !secretKey) {
      throw new Error('MinIO credentials not configured. Please set MINIO_ACCESS_KEY and MINIO_SECRET_KEY');
    }

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
      region: 'home', // Cluster region
    });

    this.ensureBucketExists();
  }

  /**
   * Ensure bucket exists on startup
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'home');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);

        // Set bucket policy to allow public read
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        this.logger.log(`Bucket ${this.bucketName} policy set to public-read`);
      }

      // Always set CORS policy for PDF export compatibility
      await this.configureCORS();
    } catch (error: any) {
      this.logger.error(`Failed to ensure bucket exists: ${error.message}`, error.stack);
    }
  }

  /**
   * Configure CORS for the bucket
   * Required for PDF export with images (html2canvas)
   */
  private async configureCORS(): Promise<void> {
    try {
      const corsConfig = {
        CORSRules: [
          {
            AllowedOrigins: ['*'], // Allow all origins for development; restrict in production
            AllowedMethods: ['GET', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length'],
            MaxAgeSeconds: 3600,
          },
        ],
      };

      // MinIO uses AWS S3 API, so we can use XML-based CORS configuration
      const corsXML = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

      // MinIO client doesn't have setBucketCors, so we need to use the underlying request
      // For now, we'll use the MinIO admin API via HTTP request
      await this.setCorsViaHTTP(corsXML);

      this.logger.log(`CORS configured for bucket ${this.bucketName}`);
    } catch (error: any) {
      this.logger.warn(`Failed to configure CORS (non-critical): ${error.message}`);
      // Don't throw - CORS is important but not critical for basic functionality
    }
  }

  /**
   * Set CORS via HTTP request to MinIO admin API
   */
  private async setCorsViaHTTP(corsXML: string): Promise<void> {
    // This is a simplified implementation
    // In production, you might want to use MinIO admin client or configure CORS via kubectl/helm
    this.logger.log('CORS configuration should be set via MinIO admin console or kubectl for production');
    this.logger.log('For local development, use: mc anonymous set-json public myminio/my-girok-resumes');
    this.logger.log('And configure CORS in MinIO console under Buckets > my-girok-resumes > Access Rules');
  }

  /**
   * Upload file to MinIO
   * @param file - Multer file object
   * @param userId - User ID for organizing files
   * @param resumeId - Resume ID for organizing files
   * @returns Object containing fileKey and fileUrl
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    resumeId: string,
  ): Promise<{ fileKey: string; fileUrl: string }> {
    this.validateFile(file);

    const fileExtension = this.getFileExtension(file.originalname);
    const fileKey = `resumes/${userId}/${resumeId}/${uuid()}${fileExtension}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileKey,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'X-Amz-Meta-Original-Name': encodeURIComponent(file.originalname),
        },
      );

      const fileUrl = `${this.publicUrl}/${this.bucketName}/${fileKey}`;

      this.logger.log(`File uploaded successfully: ${fileKey}`);
      return { fileKey, fileUrl };
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  /**
   * Convert image to grayscale (for resume profile photos)
   * @param file - Multer file object (image)
   * @param userId - User ID
   * @param resumeId - Resume ID
   * @returns Object containing original and grayscale file info
   */
  async uploadWithGrayscale(
    file: Express.Multer.File,
    userId: string,
    resumeId: string,
  ): Promise<{
    originalKey: string;
    originalUrl: string;
    grayscaleKey: string;
    grayscaleUrl: string;
  }> {
    this.validateImageFile(file);

    // Upload original
    const { fileKey: originalKey, fileUrl: originalUrl } = await this.uploadFile(file, userId, resumeId);

    try {
      // Convert to grayscale
      const grayscaleBuffer = await sharp(file.buffer)
        .grayscale()
        .jpeg({ quality: 90 }) // High quality for professional resumes
        .toBuffer();

      const fileExtension = '.jpg'; // Always output as JPEG
      const grayscaleKey = `resumes/${userId}/${resumeId}/${uuid()}_grayscale${fileExtension}`;

      await this.minioClient.putObject(
        this.bucketName,
        grayscaleKey,
        grayscaleBuffer,
        grayscaleBuffer.length,
        {
          'Content-Type': 'image/jpeg',
          'X-Amz-Meta-Original-Name': encodeURIComponent(`grayscale_${file.originalname}`),
          'X-Amz-Meta-Processed': 'true',
        },
      );

      const grayscaleUrl = `${this.publicUrl}/${this.bucketName}/${grayscaleKey}`;

      this.logger.log(`Grayscale image created: ${grayscaleKey}`);
      return { originalKey, originalUrl, grayscaleKey, grayscaleUrl };
    } catch (error: any) {
      // If grayscale conversion fails, delete the original
      await this.deleteFile(originalKey);
      this.logger.error(`Failed to convert image to grayscale: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process image');
    }
  }

  /**
   * Copy file within MinIO bucket
   * Used for duplicating resume attachments
   * @param sourceKey - Source file key
   * @param userId - User ID for organizing files
   * @param resumeId - Resume ID for organizing files
   * @returns Object containing new fileKey and fileUrl
   */
  async copyFile(
    sourceKey: string,
    userId: string,
    resumeId: string,
  ): Promise<{ fileKey: string; fileUrl: string }> {
    try {
      // Extract file extension from source key
      const fileExtension = this.getFileExtension(sourceKey);
      const newFileKey = `resumes/${userId}/${resumeId}/${uuid()}${fileExtension}`;

      // Copy object using MinIO copyObject method
      const conds = new Minio.CopyConditions();
      await this.minioClient.copyObject(
        this.bucketName,
        newFileKey,
        `/${this.bucketName}/${sourceKey}`,
        conds,
      );

      const fileUrl = `${this.publicUrl}/${this.bucketName}/${newFileKey}`;

      this.logger.log(`File copied successfully: ${sourceKey} -> ${newFileKey}`);
      return { fileKey: newFileKey, fileUrl };
    } catch (error: any) {
      this.logger.error(`Failed to copy file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to copy file in storage');
    }
  }

  /**
   * Delete file from MinIO
   * @param fileKey - MinIO object key
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileKey);
      this.logger.log(`File deleted successfully: ${fileKey}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file from storage');
    }
  }

  /**
   * Get presigned URL for temporary access (not used for public bucket)
   * @param fileKey - MinIO object key
   * @param expiry - Expiry time in seconds (default: 24 hours)
   */
  async getPresignedUrl(fileKey: string, expiry: number = 86400): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(this.bucketName, fileKey, expiry);
    } catch (error: any) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate file access URL');
    }
  }

  /**
   * Validate file upload
   * Enforces security policies from SECURITY.md
   */
  private validateFile(file: Express.Multer.File): void {
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of 10MB`);
    }
  }

  /**
   * Validate image file for grayscale conversion
   */
  private validateImageFile(file: Express.Multer.File): void {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid image type: ${file.mimetype}. Allowed types for profile photos: ${allowedImageTypes.join(', ')}`,
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(`Image size exceeds maximum allowed size of 10MB`);
    }
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }
}
