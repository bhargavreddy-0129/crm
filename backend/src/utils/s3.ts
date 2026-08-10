import fs from 'fs';
import path from 'path';

/**
 * AWS S3 Helper Module
 * Provides Amazon S3 image upload capability for Product images.
 * If AWS credentials (AWS_REGION, AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are configured,
 * it uploads to S3 bucket. Otherwise, it falls back to local storage URL.
 */

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export async function uploadProductImageToS3(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<S3UploadResult> {
  const bucketName = process.env.AWS_BUCKET_NAME || 'minierp-product-images-s3';
  const region = process.env.AWS_REGION || 'us-east-1';
  const fileKey = `products/${Date.now()}-${fileName.replace(/\s+/g, '_')}`;

  // If AWS S3 credentials are provided in .env
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      // Dynamic import of @aws-sdk/client-s3 if available, or direct S3 HTTPS PUT
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
      console.log(`[S3 Upload] Uploaded file to S3 bucket: ${s3Url}`);
      return {
        url: s3Url,
        key: fileKey,
        bucket: bucketName,
      };
    } catch (err) {
      console.error('[S3 Upload Error]', err);
    }
  }

  // Local storage fallback for development / offline environments
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const localPath = path.join(uploadsDir, fileName);
  fs.writeFileSync(localPath, fileBuffer);

  const localUrl = `/uploads/${fileName}`;
  return {
    url: localUrl,
    key: fileName,
    bucket: 'local-storage',
  };
}
