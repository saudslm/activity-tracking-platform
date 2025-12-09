// ============================================
// FILE: app/lib/storage.server.ts
// Cloudflare R2 Storage
// ============================================
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadScreenshot(
  buffer: Buffer,
  key: string,
  bucketType: "original" | "blurred" = "original"
): Promise<string> {
  const bucket =
    bucketType === "original"
      ? process.env.R2_BUCKET_ORIGINAL!
      : process.env.R2_BUCKET_BLURRED!;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000",
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function getSignedScreenshotUrl(
  key: string,
  bucketType: "original" | "blurred" = "original",
  expiresIn = 3600
): Promise<string> {
  const bucket =
    bucketType === "original"
      ? process.env.R2_BUCKET_ORIGINAL!
      : process.env.R2_BUCKET_BLURRED!;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

export async function deleteScreenshot(
  key: string,
  bucketType: "original" | "blurred" = "original"
): Promise<void> {
  const bucket =
    bucketType === "original"
      ? process.env.R2_BUCKET_ORIGINAL!
      : process.env.R2_BUCKET_BLURRED!;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export function generateScreenshotKey(
  userId: string,
  timestamp: Date
): string {
  const date = timestamp.toISOString().split("T")[0];
  const filename = `${timestamp.getTime()}-${Math.random().toString(36).slice(2)}.jpg`;
  return `users/${userId}/${date}/${filename}`;
}
