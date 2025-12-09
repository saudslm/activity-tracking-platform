// ============================================
// FILE: app/routes/api/clickup.sync.tsx
// ============================================
import { requireRole } from "~/lib/auth.server";
import { clickupSyncQueue } from "~/lib/queue.server";
import { db } from "~/lib/db.server";
import { clickupWorkspaces, users } from "~/db/schema";
import { eq } from "drizzle-orm";
import { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const payload = await requireRole(request, ["admin"]);

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const [user] = await db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    const [workspace] = await db
      .select()
      .from(clickupWorkspaces)
      .where(eq(clickupWorkspaces.organizationId, user.organizationId))
      .limit(1);

    if (!workspace) {
      return Response.json({ error: "ClickUp not connected" }, { status: 404 });
    }

    await clickupSyncQueue.add("sync-workspace", {
      workspaceId: workspace.id,
      organizationId: user.organizationId,
    });

    return Response.json({ success: true, message: "Sync started" });
  } catch (error) {
    console.error("ClickUp sync error:", error);
    return Response.json({ error: "Failed to start sync" }, { status: 500 });
  }
}