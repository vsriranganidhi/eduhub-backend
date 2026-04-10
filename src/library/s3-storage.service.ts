import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3StorageService {
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.B2_ENDPOINT!,
      region: process.env.B2_REGION!,
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // Required for Backblaze B2
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    // This Regex replaces ANY character that is not a letter, number, dot, hyphen, or underscore with a hyphen
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const fileKey = `${Date.now()}-${cleanFileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const endpoint = process.env.B2_ENDPOINT!;

    // If using Supabase, convert the S3 API URL to the Public Browser URL
    if (endpoint.includes('supabase.co')) {
      const publicBaseUrl = endpoint.replace('/s3', '/object/public');
      return `${publicBaseUrl}/${process.env.B2_BUCKET_NAME}/${fileKey}`;
    }

    // Fallback for standard S3 providers
    return `${endpoint}/${process.env.B2_BUCKET_NAME}/${fileKey}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the file key from the URL
      // URL format: "https://endpoint/bucket-name/fileKey"
      const urlParts = fileUrl.split('/');
      const fileKey = urlParts[urlParts.length - 1];

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.B2_BUCKET_NAME!,
          Key: fileKey,
        }),
      );
    } catch (error) {
      console.error('Failed to delete file from S3:', error);
      throw error;
    }
  }
}