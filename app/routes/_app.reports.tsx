// ============================================
// FILE: app/routes/_app.reports.tsx (YELLOW THEME)
// ============================================
import { IconDownload, IconCalendar } from "@tabler/icons-react";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export async function loader({ request }: LoaderFunctionArgs) {
  return { reports: [] };
}

export default function Reports() {
  const loaderData = useLoaderData<typeof loader>();
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-bold text-muted mb-1">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and download productivity reports
          </p>
        </div>
        <Button variant="outline">
          <IconDownload size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Empty State */}
      <Card className="border-border p-16 text-center">
        <div className="flex flex-col items-center space-y-4">
          <IconCalendar size={48} className="text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No reports yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Reports will appear here once you have activity data
            </p>
          </div>
          <Button>
            Generate first report
          </Button>
        </div>
      </Card>
    </div>
  );
}