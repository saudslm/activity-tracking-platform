// ============================================
// FILE: app/routes/_app.reports.tsx (MIGRATED TO SHADCN/UI)
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
          <h1 className="text-[40px] font-bold text-notion-text mb-1">
            Reports
          </h1>
          <p className="text-sm text-notion-secondary">
            Generate and download productivity reports
          </p>
        </div>
        <Button variant="outline">
          <IconDownload size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Empty State */}
      <Card className="border-notion-border p-16 text-center">
        <div className="flex flex-col items-center space-y-4">
          <IconCalendar size={48} className="text-notion-secondary" />
          <div>
            <h3 className="text-lg font-semibold text-notion-text mb-2">
              No reports yet
            </h3>
            <p className="text-sm text-notion-secondary mb-6">
              Reports will appear here once you have activity data
            </p>
          </div>
          <Button className="bg-[#2383E2] hover:bg-[#1d6bc4] font-medium">
            Generate first report
          </Button>
        </div>
      </Card>
    </div>
  );
}