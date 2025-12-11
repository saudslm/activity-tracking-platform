// ============================================
// FILE: app/routes/api.integrations.$provider.disconnect.tsx
// ============================================
import { ActionFunctionArgs, redirect } from "react-router";
import { getSession } from "~/lib/session.server";
import { db } from "~/lib/db.server";
import { users, integrations } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { ProviderType } from "~/lib/integrations/provider-registry";
import { integrationService } from "~/lib/integrations/integration-service.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const providerName = params.provider as ProviderType;

  // Get current user
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Check if user is admin
  if (currentUser.role !== "admin") {
    return redirect("/settings/integrations?error=unauthorized");
  }

  try {
    // Find the integration
    const integration = await integrationService.getIntegration({
      organizationId: currentUser.organizationId,
      provider: providerName,
    });

    if (!integration) {
      return redirect("/settings/integrations?error=not_connected");
    }

    // Disconnect integration
    await integrationService.disconnectIntegration(integration.id);

    return redirect("/settings/integrations?disconnected=true");
  } catch (error) {
    console.error(`Failed to disconnect ${providerName}:`, error);
    return redirect(
      `/settings/integrations?error=${encodeURIComponent(
        error instanceof Error ? error.message : "disconnect_failed"
      )}`
    );
  }
}