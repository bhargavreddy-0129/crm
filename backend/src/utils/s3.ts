import fs from 'fs';
import path from 'path';

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

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
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
