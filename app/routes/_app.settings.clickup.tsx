// ============================================
// FILE: app/routes/_app.settings.clickup.tsx (MIGRATED TO SHADCN/UI)
// ============================================
import { IconClick } from "@tabler/icons-react";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export async function loader({ request }: LoaderFunctionArgs) {
  return { connected: false };
}

export default function ClickUpSettings() {
  const loaderData = useLoaderData<typeof loader>();
  
  return (
    <Card className="border-notion-border p-8">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <IconClick size={24} />
              <h3 className="text-lg font-semibold text-notion-text">
                ClickUp Integration
              </h3>
            </div>
            <p className="text-sm text-notion-secondary">
              Connect your ClickUp workspace to automatically track time
            </p>
          </div>
          {loaderData.connected ? (
            <Badge variant="default" className="bg-green-500">
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              Not connected
            </Badge>
          )}
        </div>

        {!loaderData.connected && (
          <Button className="bg-[#2383E2] hover:bg-[#1d6bc4] font-medium">
            <IconClick size={16} className="mr-2" />
            Connect ClickUp
          </Button>
        )}
      </div>
    </Card>
  );
}