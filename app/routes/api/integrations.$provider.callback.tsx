// ============================================
// FILE: app/routes/api.integrations.$provider.callback.tsx
// ============================================
import { LoaderFunctionArgs, redirect } from "react-router";
import { getSession, commitSession } from "~/lib/session.server";
import { getProvider, ProviderType } from "~/lib/integrations/provider-registry";
import { integrationService } from "~/lib/integrations/integration-service.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const url = new URL(request.url);
  
  // Get OAuth parameters
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error(`OAuth error from provider:`, error);
    return redirect(`/settings/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return redirect("/settings/integrations?error=invalid_callback");
  }

  // Verify state to prevent CSRF
  const storedState = session.get("oauth_state");
  const storedProvider = session.get("oauth_provider") as ProviderType;
  const organizationId = session.get("oauth_organization_id");

  if (!storedState || state !== storedState) {
    return redirect("/settings/integrations?error=invalid_state");
  }

  if (!storedProvider || storedProvider !== params.provider) {
    return redirect("/settings/integrations?error=invalid_provider");
  }

  if (!organizationId) {
    return redirect("/settings/integrations?error=no_organization");
  }

  try {
    // Get provider instance
    const provider = getProvider(storedProvider);

    // Exchange code for tokens
    const redirectUri = `${process.env.APP_URL}/api/integrations/${storedProvider}/callback`;
    const tokens = await provider.exchangeCodeForToken(code, redirectUri);

    // Get user info from provider to store account ID
    const providerUser = await provider.getCurrentUser(tokens.accessToken);

    // Get workspace/account info if available
    let providerAccountId: string | undefined;
    let metadata: Record<string, any> = {};

    try {
      const workspaces = await provider.fetchWorkspaces(tokens.accessToken);
      if (workspaces.length > 0) {
        providerAccountId = workspaces[0].id;
        metadata.workspaces = workspaces;
        metadata.defaultWorkspace = workspaces[0];
      }
    } catch (error) {
      console.warn(`Could not fetch workspaces:`, error);
    }

    // Store integration in database
    await integrationService.connectIntegration({
      organizationId,
      provider: storedProvider,
      tokens,
      providerAccountId,
      metadata: {
        ...metadata,
        providerUser: {
          id: providerUser.id,
          name: providerUser.name,
          email: providerUser.email,
        },
        connectedAt: new Date().toISOString(),
      },
    });

    // Clear OAuth session data
    session.unset("oauth_state");
    session.unset("oauth_provider");
    session.unset("oauth_organization_id");

    // Redirect back to integrations page with success message
    return redirect("/settings/integrations?success=true", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    console.error(`Failed to connect ${storedProvider}:`, error);
    
    // Clear OAuth session data
    session.unset("oauth_state");
    session.unset("oauth_provider");
    session.unset("oauth_organization_id");

    return redirect(
      `/settings/integrations?error=${encodeURIComponent(
        error instanceof Error ? error.message : "connection_failed"
      )}`,
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      }
    );
  }
}