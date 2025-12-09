// ============================================
// FILE: worker/index.ts
// ============================================
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processScreenshot } from "./jobs/screenshot-processor";
import { syncClickUpWorkspace } from "./jobs/clickup-sync";

const connection = new IORedis(process.env.REDIS_TLS_URL || process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  ...(process.env.REDIS_TLS_URL && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
});

const screenshotWorker = new Worker(
  "screenshot-processing",
  processScreenshot,
  {
    connection,
    concurrency: 5,
  }
);

const clickupWorker = new Worker("clickup-sync", syncClickUpWorkspace, {
  connection,
  concurrency: 3,
});

screenshotWorker.on("completed", (job) => {
  console.log(`✅ Screenshot job ${job.id} completed`);
});

screenshotWorker.on("failed", (job, err) => {
  console.error(`❌ Screenshot job ${job?.id} failed:`, err);
});

clickupWorker.on("completed", (job) => {
  console.log(`✅ ClickUp sync job ${job.id} completed`);
});

clickupWorker.on("failed", (job, err) => {
  console.error(`❌ ClickUp sync job ${job?.id} failed:`, err);
});

console.log("🚀 Workers started on Heroku");

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await screenshotWorker.close();
  await clickupWorker.close();
  process.exit(0);
});