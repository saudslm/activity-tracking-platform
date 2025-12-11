// ============================================
// FILE: app/routes/api.integrations.$provider.sync.tsx
// ============================================
import { ActionFunctionArgs } from "react-router";
import { getSession } from "~/lib/session.server";
import { smartSyncService } from "~/lib/integrations/smart-sync-service.server";
import { db } from "~/lib/db.server";
import { integrations, users } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { ProviderType } from "~/lib/integrations/provider-registry";

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = params.provider as ProviderType;

  if (!provider) {
    return Response.json({ error: "Provider not specified" }, { status: 400 });
  }

  try {
    // Get user's organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get the integration for this provider
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, user.organizationId),
          eq(integrations.provider, provider),
          eq(integrations.isActive, true)
        )
      )
      .limit(1);

    if (!integration) {
      return Response.json(
        { error: `${provider} integration not found or not active` },
        { status: 404 }
      );
    }

    // Check if user is admin (only admins can trigger sync)
    if (user.role !== "admin") {
      return Response.json(
        { error: "Only administrators can trigger sync" },
        { status: 403 }
      );
    }

    // Get full sync parameter (optional)
    const formData = await request.formData();
    const fullSync = formData.get("full") === "true";

    console.log(
      `🔄 ${fullSync ? "Full" : "Smart"} sync triggered for ${provider} by user ${user.name}`
    );

    // Trigger sync
    const stats = await smartSyncService.syncIntegration({
      integrationId: integration.id,
      organizationId: user.organizationId,
      accessToken: integration.accessToken,
      provider,
      full: fullSync,
    });

    console.log(`✅ Sync completed for ${provider}:`, stats);

    return Response.json({
      success: true,
      stats: {
        containers: stats.containers || 0,
        projects: stats.projects || 0,
        collections: stats.collections || 0,
        tasks: stats.tasks || 0,
      },
      message: `Successfully synced ${
        stats.containers + stats.projects + stats.collections + stats.tasks
      } resources from ${provider}`,
      syncType: fullSync ? "full" : "smart",
    });
  } catch (error) {
    console.error(`❌ Sync failed for ${provider}:`, error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
        details:
          error instanceof Error
            ? error.stack
            : "Unknown error occurred during sync",
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function loader() {
  return Response.json(
    { error: "Method not allowed. Use POST to trigger sync." },
    { status: 405 }
  );
}