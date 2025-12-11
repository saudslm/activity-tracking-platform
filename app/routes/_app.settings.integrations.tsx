// ============================================
// FILE: app/routes/_app.settings.integrations.tsx (UPDATED WITH SYNC)
// ============================================
import { LoaderFunctionArgs, useLoaderData, useFetcher } from "react-router";
import { getSession } from "~/lib/session.server";
import { db } from "~/lib/db.server";
import { integrations, users, syncedResources } from "~/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { 
  IconCheck, 
  IconRefresh, 
  IconX,
  IconAlertCircle,
  IconClock,
} from "@tabler/icons-react";
import { providerRegistry } from "~/lib/integrations/provider-registry";
import { SafeDate } from "~/components/safe-date";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");
  const url = new URL(request.url);

  // Get success/error messages from URL
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

  // Get user with organization
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Get all available providers
  const availableProviders = providerRegistry.getAllMetadata();

  // Get connected integrations with sync stats
  const connectedIntegrations = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      providerAccountId: integrations.providerAccountId,
      isActive: integrations.isActive,
      lastSyncedAt: integrations.lastSyncedAt,
      createdAt: integrations.createdAt,
      metadata: integrations.metadata,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.organizationId, user.organizationId),
        eq(integrations.isActive, true)
      )
    );

  // Get resource counts for each integration
  const integrationsWithStats = await Promise.all(
    connectedIntegrations.map(async (integration) => {
      const [stats] = await db
        .select({
          containers: sql<number>`COUNT(*) FILTER (WHERE resource_type = 'container')`,
          projects: sql<number>`COUNT(*) FILTER (WHERE resource_type = 'project')`,
          collections: sql<number>`COUNT(*) FILTER (WHERE resource_type = 'collection')`,
          tasks: sql<number>`COUNT(*) FILTER (WHERE resource_type = 'task')`,
          total: sql<number>`COUNT(*)`,
        })
        .from(syncedResources)
        .where(eq(syncedResources.integrationId, integration.id));

      return {
        ...integration,
        stats: {
          containers: Number(stats.containers) || 0,
          projects: Number(stats.projects) || 0,
          collections: Number(stats.collections) || 0,
          tasks: Number(stats.tasks) || 0,
          total: Number(stats.total) || 0,
        },
      };
    })
  );

  return {
    user,
    availableProviders,
    connectedIntegrations: integrationsWithStats,
    messages: {
      success,
      error,
    },
  };
}

export default function IntegrationsSettings() {
  const { user, availableProviders, connectedIntegrations, messages } = useLoaderData<typeof loader>();
  const syncFetcher = useFetcher();

  const isAdmin = user.role === "admin";
  const isSyncing = syncFetcher.state !== "idle";

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "clickup":
        return <IconCheck size={24} className="text-primary" />;
      default:
        return <IconCheck size={24} className="text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[40px] font-bold text-muted mb-1">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect TimeTrack with your project management tools
        </p>
      </div>

      {/* Success/Error Messages */}
      {messages.success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <IconCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            Integration connected successfully! Resources are being synced in the background.
          </AlertDescription>
        </Alert>
      )}

      {messages.error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <IconAlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            {messages.error === "invalid_state"
              ? "Invalid state parameter. Please try again."
              : messages.error === "invalid_callback"
              ? "Invalid callback parameters. Please try again."
              : messages.error === "connection_failed"
              ? "Failed to connect integration. Please try again."
              : `Error: ${messages.error}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Success Message */}
      {syncFetcher.data?.success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <IconCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            {syncFetcher.data.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Error Message */}
      {syncFetcher.data?.error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <IconAlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            Sync failed: {syncFetcher.data.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Connected Integrations */}
      {connectedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl text-muted-foreground font-semibold">Connected Integrations</h2>
          {connectedIntegrations.map((integration) => {
            const provider = availableProviders.find((p) => p.name === integration.provider);
            const isSyncingThis = isSyncing && syncFetcher.formData?.get("provider") === integration.provider;

            return (
              <Card key={integration.id} className="border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(integration.provider)}
                      <div>
                        <CardTitle className="text-lg">{provider?.displayName}</CardTitle>
                        <CardDescription>
                          Connected <SafeDate date={integration.createdAt} format="date" />
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      <IconCheck size={14} className="mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sync Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{integration.stats.containers}</p>
                      <p className="text-xs text-muted-foreground">Workspaces</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{integration.stats.projects}</p>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{integration.stats.collections}</p>
                      <p className="text-xs text-muted-foreground">Lists</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{integration.stats.tasks}</p>
                      <p className="text-xs text-muted-foreground">Tasks</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{integration.stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>

                  {/* Last Synced */}
                  {integration.lastSyncedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconClock size={16} />
                      Last synced: <SafeDate date={integration.lastSyncedAt} format="datetime" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Smart Sync Button */}
                    {isAdmin && (
                      <syncFetcher.Form method="post" action={`/api/integrations/${integration.provider}/sync`}>
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={isSyncingThis}
                        >
                          {isSyncingThis ? (
                            <>
                              <IconRefresh size={16} className="mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <IconRefresh size={16} className="mr-2" />
                              Smart Sync
                            </>
                          )}
                        </Button>
                      </syncFetcher.Form>
                    )}

                    {/* Full Sync Button */}
                    {isAdmin && (
                      <syncFetcher.Form method="post" action={`/api/integrations/${integration.provider}/sync`}>
                        <input type="hidden" name="full" value="true" />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={isSyncingThis}
                        >
                          {isSyncingThis ? (
                            <>
                              <IconRefresh size={16} className="mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <IconRefresh size={16} className="mr-2" />
                              Full Sync
                            </>
                          )}
                        </Button>
                      </syncFetcher.Form>
                    )}

                    {/* Disconnect Button */}
                    {isAdmin && (
                      <form method="post" action={`/api/integrations/${integration.provider}/disconnect`}>
                        <Button type="submit" variant="destructive" size="sm">
                          <IconX size={16} className="mr-2" />
                          Disconnect
                        </Button>
                      </form>
                    )}

                    {!isAdmin && (
                      <p className="text-sm text-muted-foreground italic">
                        Only administrators can manage integrations
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Available Integrations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableProviders.map((provider) => {
            const isConnected = connectedIntegrations.some(
              (i) => i.provider === provider.name
            );

            return (
              <Card
                key={provider.name}
                className={`border-border ${
                  !provider.isEnabled ? "opacity-60" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(provider.name)}
                      <div>
                        <CardTitle className="text-base">{provider.displayName}</CardTitle>
                        {isConnected && (
                          <Badge
                            variant="default"
                            className="mt-1 bg-green-500/10 text-green-600 dark:text-green-400"
                          >
                            Connected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {provider.isEnabled ? (
                    isConnected ? (
                      <Button variant="outline" disabled className="w-full">
                        <IconCheck size={16} className="mr-2" />
                        Connected
                      </Button>
                    ) : isAdmin ? (
                      <form
                        method="get"
                        action={`/api/integrations/${provider.name}/connect`}
                      >
                        <Button type="submit" className="w-full">
                          Connect {provider.displayName}
                        </Button>
                      </form>
                    ) : (
                      <Button variant="outline" disabled className="w-full">
                        Admin Only
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" disabled className="w-full">
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IconAlertCircle size={20} className="text-blue-600" />
            About Syncing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Smart Sync:</strong> Syncs your most recent and active resources (workspaces, projects, lists, and tasks). 
            This is fast and recommended for daily use.
          </p>
          <p>
            <strong>Full Sync:</strong> Syncs all resources from your integration. This takes longer but ensures you have 
            complete data. Use this if you need to refresh everything.
          </p>
          <p>
            <strong>Automatic Sync:</strong> When you first connect an integration, we automatically perform a smart sync 
            in the background. You can manually trigger syncs anytime using the buttons above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}