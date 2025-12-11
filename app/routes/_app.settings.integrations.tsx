// ============================================
// FILE: app/routes/_app.settings.integrations.tsx (FIXED)
// ============================================
import { LoaderFunctionArgs, useLoaderData, useFetcher } from "react-router";
import { IconPlug, IconCheck, IconX, IconRefresh, IconAlertCircle } from "@tabler/icons-react";
import { getSession } from "~/lib/session.server";
import { db } from "~/lib/db.server";
import { users, integrations } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { providerRegistry } from "~/lib/integrations/provider-registry";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { SafeDate } from "~/components/safe-date";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");
  const url = new URL(request.url);

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Get all available providers
  const allProviders = providerRegistry.getAllMetadata();

  // Get connected integrations
  const connectedIntegrations = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.organizationId, currentUser.organizationId),
        eq(integrations.isActive, true)
      )
    );

  // Map providers with connection status
  const providersWithStatus = allProviders.map((provider) => {
    const connected = connectedIntegrations.find(
      (int) => int.provider === provider.name
    );

    return {
      ...provider,
      connected: !!connected,
      integration: connected || null,
    };
  });

  // Get URL params for messages
  const success = url.searchParams.get("success");
  const disconnected = url.searchParams.get("disconnected");
  const error = url.searchParams.get("error");

  return {
    providers: providersWithStatus,
    userRole: currentUser.role,
    messages: {
      success: success === "true",
      disconnected: disconnected === "true",
      error: error ? decodeURIComponent(error) : null,
    },
  };
}

export default function IntegrationsSettings() {
  const { providers, userRole, messages } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const canManageIntegrations = userRole === "admin";

  const handleDisconnect = (providerName: string, displayName: string) => {
    if (confirm(`Are you sure you want to disconnect ${displayName}? This will stop all syncing.`)) {
      fetcher.submit(
        {},
        {
          method: "post",
          action: `/api/integrations/${providerName}/disconnect`,
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Connect with your favorite project management tools
        </p>
      </div>

      {/* Success/Error Messages */}
      {messages.success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <IconCheck size={16} className="text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Integration connected successfully! You can now sync your data.
          </AlertDescription>
        </Alert>
      )}

      {messages.disconnected && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <IconCheck size={16} className="text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Integration disconnected successfully.
          </AlertDescription>
        </Alert>
      )}

      {messages.error && (
        <Alert variant="destructive">
          <IconAlertCircle size={16} />
          <AlertDescription>
            {messages.error === "unauthorized" && "Only administrators can manage integrations."}
            {messages.error === "provider_not_available" && "This integration is not available yet."}
            {messages.error === "invalid_callback" && "Invalid OAuth callback. Please try again."}
            {messages.error === "invalid_state" && "Security validation failed. Please try again."}
            {messages.error === "connection_failed" && "Failed to connect. Please try again."}
            {!["unauthorized", "provider_not_available", "invalid_callback", "invalid_state", "connection_failed"].includes(messages.error) && 
              `Error: ${messages.error}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card 
            key={provider.name} 
            className={`border-border ${!provider.isEnabled ? 'opacity-60' : ''}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${provider.color}15` }}
                  >
                    <IconPlug 
                      size={24} 
                      style={{ color: provider.color }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">
                      {provider.displayName}
                    </CardTitle>
                    {provider.connected && (
                      <Badge 
                        variant="default" 
                        className="mt-1 bg-green-500 hover:bg-green-600"
                      >
                        <IconCheck size={12} className="mr-1" />
                        Connected
                      </Badge>
                    )}
                    {!provider.isEnabled && (
                      <Badge variant="secondary" className="mt-1">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <CardDescription className="text-muted-foreground">
                {provider.description}
              </CardDescription>

              {/* Features */}
              <div className="flex flex-wrap gap-2">
                {provider.features.timeTracking && (
                  <Badge variant="outline" className="text-xs">
                    Time Tracking
                  </Badge>
                )}
                {provider.features.tasks && (
                  <Badge variant="outline" className="text-xs">
                    Tasks
                  </Badge>
                )}
                {provider.features.projects && (
                  <Badge variant="outline" className="text-xs">
                    Projects
                  </Badge>
                )}
                {provider.features.workspaces && (
                  <Badge variant="outline" className="text-xs">
                    Workspaces
                  </Badge>
                )}
              </div>

              {/* Connection Status - FIXED WITH SafeDate */}
              {provider.connected && provider.integration && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Connected <SafeDate date={provider.integration.createdAt} format="date" />
                    </span>
                    {provider.integration.lastSyncedAt && (
                      <span className="flex items-center gap-1">
                        <IconRefresh size={12} />
                        <SafeDate date={provider.integration.lastSyncedAt} format="date" />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {provider.isEnabled && !provider.connected && canManageIntegrations && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      window.location.href = `/api/integrations/${provider.name}/connect`;
                    }}
                  >
                    Connect {provider.displayName}
                  </Button>
                )}

                {provider.isEnabled && provider.connected && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        window.location.href = `/settings/integrations/${provider.name}`;
                      }}
                    >
                      Configure
                    </Button>
                    {canManageIntegrations && (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDisconnect(provider.name, provider.displayName)}
                        disabled={fetcher.state === "submitting"}
                      >
                        <IconX size={16} />
                      </Button>
                    )}
                  </>
                )}

                {!provider.isEnabled && (
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Only admins can manage */}
      {!canManageIntegrations && (
        <Card className="border-border bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Only administrators can manage integrations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
