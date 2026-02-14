import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Initialize R2 client using Convex environment variables
 * R2 is S3-compatible, so we use the AWS S3 SDK
 */
export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured in Convex environment variables");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Generate presigned URL for uploading file to R2
 * @param key - R2 object key (path)
 * @param bucket - R2 bucket name
 * @param expiresIn - URL expiry in seconds (default: 5 minutes)
 */
export async function generateUploadUrl(
  key: string,
  bucket: string,
  expiresIn = 300 // 5 minutes
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate presigned URL for downloading file from R2
 * @param key - R2 object key (path)
 * @param bucket - R2 bucket name
 * @param expiresIn - URL expiry in seconds (default: 1 hour)
 */
export async function generateDownloadUrl(
  key: string,
  bucket: string,
  expiresIn = 3600 // 1 hour
): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}
