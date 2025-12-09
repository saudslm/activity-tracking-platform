// ============================================
// FILE: app/routes/api/activity.tsx
// ============================================
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { timeEntries, screenshots, users, organizations } from "~/db/schema";
import { eq } from "drizzle-orm";
import { screenshotQueue } from "~/lib/queue.server";
import { generateScreenshotKey } from "~/lib/storage.server";

import { ActionFunctionArgs } from "react-router";

interface ActivityData {
  startTime: string;
  endTime?: string;
  activityPercentage: number;
  mouseClicks: number;
  keyboardStrokes: number;
  windowTitle: string;
  applicationName: string;
  screenshots?: Array<{
    timestamp: string;
    imageBase64: string;
  }>;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const payload = await requireAuth(request);
    const data: ActivityData = await request.json();

    if (!data.startTime || !data.windowTitle || !data.applicationName) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [user] = await db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        canBlurScreenshots: users.canBlurScreenshots,
        settings: organizations.settings,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const [entry] = await db
      .insert(timeEntries)
      .values({
        userId: payload.userId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        activityPercentage: data.activityPercentage,
        mouseClicks: data.mouseClicks,
        keyboardStrokes: data.keyboardStrokes,
      })
      .returning();

    const screenshotIds: string[] = [];
    
    if (data.screenshots && data.screenshots.length > 0) {
      const orgSettings = user.settings as any;
      const shouldBlur =
        orgSettings?.blurMode === "always" ||
        (orgSettings?.blurMode === "optional" && user.canBlurScreenshots);

      for (const screenshot of data.screenshots) {
        const timestamp = new Date(screenshot.timestamp);
        const r2Key = generateScreenshotKey(payload.userId, timestamp);

        const [screenshotRecord] = await db
          .insert(screenshots)
          .values({
            timeEntryId: entry.id,
            userId: payload.userId,
            timestamp,
            r2KeyOriginal: r2Key,
            windowTitle: data.windowTitle,
            applicationName: data.applicationName,
            isBlurred: shouldBlur,
          })
          .returning();

        screenshotIds.push(screenshotRecord.id);

        await screenshotQueue.add("process-screenshot", {
          screenshotId: screenshotRecord.id,
          userId: payload.userId,
          originalBuffer: screenshot.imageBase64,
          shouldBlur,
        });
      }
    }

    return Response.json({
      success: true,
      timeEntryId: entry.id,
      screenshotIds,
      message: "Activity recorded and queued for Cloudflare R2 upload",
    });
  } catch (error: any) {
    console.error("Activity recording error:", error);
    
    if (error instanceof Response && error.status === 401) {
      return error;
    }

    return Response.json({ error: "Failed to record activity" }, { status: 500 });
  }
}
