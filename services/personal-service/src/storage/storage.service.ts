import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { ID } from '@my-girok/nest-common';

/**
 * Storage Service for MinIO Integration
 * Handles file upload, download, and deletion
 * Note: Grayscale conversion removed per policy - handled by frontend CSS filter
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
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') || `http://${endPoint}:${port}`;

    if (!accessKey || !secretKey) {
      throw new Error(
        'MinIO credentials not configured. Please set MINIO_ACCESS_KEY and MINIO_SECRET_KEY',
      );
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
      // CORS configuration XML for reference
      // In production, configure CORS via MinIO admin console or kubectl
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

      // Log CORS setup instructions
      await this.logCorsSetupInstructions(corsXML);

      this.logger.log(`CORS configuration instructions logged for bucket ${this.bucketName}`);
    } catch (error: any) {
      this.logger.warn(`Failed to log CORS configuration (non-critical): ${error.message}`);
      // Don't throw - CORS is important but not critical for basic functionality
    }
  }

  /**
   * Log CORS setup instructions for MinIO admin
   */
  private async logCorsSetupInstructions(_corsXML: string): Promise<void> {
    // This is a simplified implementation
    // In production, you might want to use MinIO admin client or configure CORS via kubectl/helm
    this.logger.log(
      'CORS configuration should be set via MinIO admin console or kubectl for production',
    );
    this.logger.log(
      'For local development, use: mc anonymous set-json public myminio/my-girok-resumes',
    );
    this.logger.log(
      'And configure CORS in MinIO console under Buckets > my-girok-resumes > Access Rules',
    );
    this.logger.log('See scripts/configure-minio-cors.sh for automated CORS setup');
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
    const fileKey = `resumes/${userId}/${resumeId}/${ID.generate()}${fileExtension}`;

    try {
      await this.minioClient.putObject(this.bucketName, fileKey, file.buffer, file.size, {
        'Content-Type': file.mimetype,
        'X-Amz-Meta-Original-Name': encodeURIComponent(file.originalname),
      });

      const fileUrl = `${this.publicUrl}/${this.bucketName}/${fileKey}`;

      this.logger.log(`File uploaded successfully: ${fileKey}`);
      return { fileKey, fileUrl };
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file to storage');
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
      const newFileKey = `resumes/${userId}/${resumeId}/${ID.generate()}${fileExtension}`;

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
   * Get file stream from MinIO
   * Used for image proxy to serve images with CORS headers
   * @param fileKey - MinIO object key
   * @returns Object with stream and metadata
   */
  async getFileStream(
    fileKey: string,
  ): Promise<{ stream: any; contentType: string; size: number }> {
    try {
      // Get object metadata
      const stat = await this.minioClient.statObject(this.bucketName, fileKey);

      // Get object stream
      const stream = await this.minioClient.getObject(this.bucketName, fileKey);

      this.logger.log(`File stream retrieved: ${fileKey}`);
      return {
        stream,
        contentType: stat.metaData['content-type'] || 'application/octet-stream',
        size: stat.size,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get file stream: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve file from storage');
    }
  }

  /**
   * Get presigned URL for temporary access
   * @param fileKey - MinIO object key
   * @param expiry - Expiry time in seconds (default: 1 hour)
   */
  async getPresignedUrl(fileKey: string, expiry: number = 3600): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(this.bucketName, fileKey, expiry);
    } catch (error: any) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate file access URL');
    }
  }

  /**
   * Upload file to temporary storage
   * Files in tmp/ are automatically deleted after 24 hours via MinIO lifecycle policy
   * @param file - Multer file object
   * @param userId - User ID for organizing files (from JWT, verified)
   * @returns Object containing tempKey and presigned preview URL
   */
  async uploadToTemp(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ tempKey: string; previewUrl: string; fileSize: number; mimeType: string }> {
    this.validateImageFile(file);

    const fileExtension = this.getFileExtension(file.originalname);
    const tempKey = `tmp/${userId}/${ID.generate()}${fileExtension}`;

    try {
      await this.minioClient.putObject(this.bucketName, tempKey, file.buffer, file.size, {
        'Content-Type': file.mimetype,
        'X-Amz-Meta-Original-Name': encodeURIComponent(file.originalname),
        'X-Amz-Meta-Temp': 'true',
        'X-Amz-Meta-User-Id': userId,
      });

      // Generate presigned URL for preview (1 hour validity)
      const previewUrl = await this.getPresignedUrl(tempKey, 3600);

      this.logger.log(`Temp file uploaded successfully: ${tempKey}`);
      return {
        tempKey,
        previewUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload temp file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file to temporary storage');
    }
  }

  /**
   * Move file from temporary storage to permanent storage
   * Moves file from temp to permanent storage
   * @param tempKey - Temporary file key (must belong to userId)
   * @param userId - User ID (from JWT, for ownership verification)
   * @param resumeId - Resume ID for permanent storage path
   * @returns Object containing permanent file info
   */
  async moveFromTemp(
    tempKey: string,
    userId: string,
    resumeId: string,
  ): Promise<{
    fileKey: string;
    fileUrl: string;
  }> {
    // Security: Verify tempKey belongs to userId (path traversal prevention)
    const expectedPrefix = `tmp/${userId}/`;
    if (!tempKey.startsWith(expectedPrefix)) {
      this.logger.warn(`Unauthorized temp file access attempt: ${tempKey} by user ${userId}`);
      throw new BadRequestException('Invalid temp file key');
    }

    try {
      // Get the temp file
      const tempStream = await this.minioClient.getObject(this.bucketName, tempKey);
      const chunks: Buffer[] = [];
      for await (const chunk of tempStream) {
        chunks.push(chunk as Buffer);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Get metadata
      const stat = await this.minioClient.statObject(this.bucketName, tempKey);
      const originalName = stat.metaData['x-amz-meta-original-name']
        ? decodeURIComponent(stat.metaData['x-amz-meta-original-name'])
        : 'image.jpg';
      const mimeType = stat.metaData['content-type'] || 'image/jpeg';

      // Generate permanent file key
      const fileExtension = this.getFileExtension(originalName);
      const fileKey = `resumes/${userId}/${resumeId}/${ID.generate()}${fileExtension}`;

      // Upload to permanent location
      await this.minioClient.putObject(this.bucketName, fileKey, fileBuffer, fileBuffer.length, {
        'Content-Type': mimeType,
        'X-Amz-Meta-Original-Name': encodeURIComponent(originalName),
      });

      const fileUrl = `${this.publicUrl}/${this.bucketName}/${fileKey}`;

      // Note: Grayscale conversion removed per policy (.ai/resume.md)
      // Profile photos show in color by default, grayscale is optional via UI toggle
      // Frontend handles grayscale display using CSS filter when user selects B&W mode

      // Delete temp file after successful move
      await this.deleteFile(tempKey);

      this.logger.log(`File moved from temp to permanent: ${tempKey} -> ${fileKey}`);
      return { fileKey, fileUrl };
    } catch (error: any) {
      this.logger.error(`Failed to move temp file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to move file from temporary storage');
    }
  }

  /**
   * Delete temp file (for cleanup when user cancels)
   * @param tempKey - Temporary file key (must belong to userId)
   * @param userId - User ID (from JWT, for ownership verification)
   */
  async deleteTempFile(tempKey: string, userId: string): Promise<void> {
    // Security: Verify tempKey belongs to userId
    const expectedPrefix = `tmp/${userId}/`;
    if (!tempKey.startsWith(expectedPrefix)) {
      this.logger.warn(`Unauthorized temp file delete attempt: ${tempKey} by user ${userId}`);
      throw new BadRequestException('Invalid temp file key');
    }

    await this.deleteFile(tempKey);
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
