// ============================================
// FILE: worker/jobs/screenshot-processor.ts
// ============================================
import { Job } from "bullmq";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../app/db/schema";
import { eq } from "drizzle-orm";
import { uploadScreenshot } from "../../app/lib/storage.server";
import sharp from "sharp";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

interface ScreenshotJobData {
  screenshotId: string;
  userId: string;
  originalBuffer: string;
  shouldBlur: boolean;
}

export async function processScreenshot(job: Job<ScreenshotJobData>) {
  const { screenshotId, userId, originalBuffer, shouldBlur } = job.data;

  try {
    const buffer = Buffer.from(originalBuffer, "base64");

    const [screenshot] = await db
      .select()
      .from(schema.screenshots)
      .where(eq(schema.screenshots.id, screenshotId))
      .limit(1);

    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    const optimizedBuffer = await sharp(buffer)
      .jpeg({ quality: 85 })
      .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
      .toBuffer();

    await uploadScreenshot(
      optimizedBuffer,
      screenshot.r2KeyOriginal,
      "original"
    );

    if (shouldBlur) {
      const blurredBuffer = await sharp(optimizedBuffer)
        .blur(20)
        .toBuffer();

      const blurredKey = `${screenshot.r2KeyOriginal.replace('.jpg', '_blurred.jpg')}`;
      
      await uploadScreenshot(blurredBuffer, blurredKey, "blurred");

      await db
        .update(schema.screenshots)
        .set({ r2KeyBlurred: blurredKey })
        .where(eq(schema.screenshots.id, screenshotId));
    }

    console.log(`✅ Screenshot ${screenshotId} uploaded to Cloudflare R2`);
  } catch (error) {
    console.error(`❌ Failed to process screenshot ${screenshotId}:`, error);
    throw error;
  }
}