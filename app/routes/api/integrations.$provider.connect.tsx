// ============================================
// FILE: app/routes/api.integrations.$provider.connect.tsx
// ============================================
import { LoaderFunctionArgs, redirect } from "react-router";
import { getSession, commitSession } from "~/lib/session.server";
import { getProvider, ProviderType, providerRegistry } from "~/lib/integrations/provider-registry";
import { db } from "~/lib/db.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const providerName = params.provider as ProviderType;

  // Check if provider exists and is enabled
  if (!providerRegistry.isProviderEnabled(providerName)) {
    return redirect("/settings/integrations?error=provider_not_available");
  }

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

  // Get provider instance
  const provider = getProvider(providerName);

  // Generate state for OAuth security
  const state = crypto.randomUUID();
  
  // Store state and provider in session for validation in callback
  session.set("oauth_state", state);
  session.set("oauth_provider", providerName);
  session.set("oauth_organization_id", currentUser.organizationId);

  // Generate OAuth URL
  const redirectUri = `${process.env.APP_URL}/api/integrations/${providerName}/callback`;
  const authUrl = provider.getAuthUrl(state, redirectUri);

  // Commit session and redirect to OAuth provider
  return redirect(authUrl, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}