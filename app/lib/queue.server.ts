// ============================================
// FILE: app/lib/queue.server.ts
// ============================================
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_TLS_URL || process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  ...(process.env.REDIS_TLS_URL && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
});

export const screenshotQueue = new Queue("screenshot-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const clickupSyncQueue = new Queue("clickup-sync", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

export interface ScreenshotJobData {
  screenshotId: string;
  userId: string;
  originalBuffer: string;
  shouldBlur: boolean;
}

export interface ClickUpSyncJobData {
  timeEntryId: string;
  userId: string;
  workspaceId: string;
  taskId?: string;
}
