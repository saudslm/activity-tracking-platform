// ============================================
// FILE: app/routes/api/screenshots.tsx
// ============================================
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";
import { screenshots, organizations, users } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteScreenshot } from "~/lib/storage.server";
import { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const payload = await requireAuth(request);

  if (request.method === "DELETE") {
    const { screenshotId } = await request.json();

    const [user] = await db
      .select({
        settings: organizations.settings,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, payload.userId))
      .limit(1);

    const orgSettings = user?.settings as any;
    if (!orgSettings?.allowScreenshotDelete) {
      return Response.json(
        { error: "Screenshot deletion not allowed" },
        { status: 403 }
      );
    }

    const [screenshot] = await db
      .select()
      .from(screenshots)
      .where(
        and(
          eq(screenshots.id, screenshotId),
          eq(screenshots.userId, payload.userId)
        )
      )
      .limit(1);

    if (!screenshot) {
      return Response.json({ error: "Screenshot not found" }, { status: 404 });
    }

    const gracePeriodMinutes = orgSettings?.deleteGracePeriod || 5;
    const screenshotAge =
      (Date.now() - new Date(screenshot.timestamp).getTime()) / 1000 / 60;

    if (screenshotAge > gracePeriodMinutes) {
      return Response.json({ error: "Grace period expired" }, { status: 403 });
    }

    try {
      await deleteScreenshot(screenshot.r2KeyOriginal, "original");
      if (screenshot.r2KeyBlurred) {
        await deleteScreenshot(screenshot.r2KeyBlurred, "blurred");
      }
    } catch (error) {
      console.error("Failed to delete from Cloudflare R2:", error);
    }

    await db
      .update(screenshots)
      .set({ isDeleted: true })
      .where(eq(screenshots.id, screenshotId));

    return Response.json({ success: true, message: "Screenshot deleted from Cloudflare R2" });
  }

  if (request.method === "PATCH") {
    const { screenshotId } = await request.json();

    const [screenshot] = await db
      .select()
      .from(screenshots)
      .where(
        and(
          eq(screenshots.id, screenshotId),
          eq(screenshots.userId, payload.userId)
        )
      )
      .limit(1);

    if (!screenshot) {
      return Response.json({ error: "Screenshot not found" }, { status: 404 });
    }

    await db
      .update(screenshots)
      .set({ isBlurred: !screenshot.isBlurred })
      .where(eq(screenshots.id, screenshotId));

    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}