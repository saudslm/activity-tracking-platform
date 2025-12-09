// ============================================
// FILE: app/routes/api/clickup.callback.tsx
// ============================================
import { LoaderFunctionArgs, redirect } from "react-router";
import { getSession } from "~/lib/session.server";
import { exchangeCodeForToken, getWorkspaces } from "~/lib/clickup.server";
import { db } from "~/lib/db.server";
import { users, clickupWorkspaces } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    return redirect("/login");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/settings/clickup?error=no_code");
  }

  try {
    const { access_token } = await exchangeCodeForToken(code);
    const { teams } = await getWorkspaces(access_token);

    const [user] = await db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (teams && teams.length > 0) {
      const workspace = teams[0];

      await db.insert(clickupWorkspaces).values({
        organizationId: user.organizationId,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        accessToken: access_token,
        lastSyncedAt: new Date(),
      });
    }

    return redirect("/settings/clickup?success=true");
  } catch (error) {
    console.error("ClickUp OAuth error:", error);
    return redirect("/settings/clickup?error=oauth_failed");
  }
}