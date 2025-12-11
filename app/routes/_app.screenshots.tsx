// ============================================
// FILE: app/routes/_app.screenshots.tsx (YELLOW THEME)
// ============================================
import { useState } from "react";
import { IconTrash, IconEye, IconBlur } from "@tabler/icons-react";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/session.server";
import { screenshots } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSignedScreenshotUrl } from "~/lib/storage.server";
import { format } from "date-fns";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  const userScreenshots = await db
    .select({
      id: screenshots.id,
      timestamp: screenshots.timestamp,
      windowTitle: screenshots.windowTitle,
      applicationName: screenshots.applicationName,
      isBlurred: screenshots.isBlurred,
      r2KeyOriginal: screenshots.r2KeyOriginal,
      r2KeyBlurred: screenshots.r2KeyBlurred,
    })
    .from(screenshots)
    .where(
      and(
        eq(screenshots.userId, userId),
        eq(screenshots.isDeleted, false)
      )
    )
    .orderBy(desc(screenshots.timestamp))
    .limit(50);

  const screenshotsWithUrls = await Promise.all(
    userScreenshots.map(async (screenshot) => {
      const url = await getSignedScreenshotUrl(
        screenshot.isBlurred ? screenshot.r2KeyBlurred! : screenshot.r2KeyOriginal,
        screenshot.isBlurred ? "blurred" : "original"
      );

      return { ...screenshot, url };
    })
  );

  return { screenshots: screenshotsWithUrls };
}

export default function Screenshots() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const loaderData = useLoaderData<typeof loader>();

  const openPreview = (screenshot: any) => {
    setSelectedScreenshot(screenshot);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[40px] font-bold text-muted mb-1">
          Screenshots
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage captured screenshots from Cloudflare R2
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <Select defaultValue={format(new Date(), "yyyy-MM-dd")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={format(new Date(), "yyyy-MM-dd")}>
              Today
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {loaderData.screenshots.length} screenshots
        </p>
      </div>

      {/* Screenshots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loaderData.screenshots.map((screenshot) => (
          <Card key={screenshot.id} className="border-border overflow-hidden hover:shadow-md transition-shadow">
            <button
              onClick={() => openPreview(screenshot)}
              className="w-full"
            >
              <div className="h-40 bg-muted">
                <img
                  src={screenshot.url}
                  alt="Screenshot"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  {format(new Date(screenshot.timestamp), "HH:mm:ss")}
                </p>
                {screenshot.isBlurred && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <IconBlur size={12} />
                    Blurred
                  </Badge>
                )}
              </div>

              <p className="text-sm font-medium text-foreground truncate">
                {screenshot.applicationName}
              </p>

              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                {screenshot.windowTitle}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => openPreview(screenshot)}
                >
                  <IconEye size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <IconTrash size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedScreenshot?.applicationName}
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="space-y-4">
              <img
                src={selectedScreenshot.url}
                alt="Screenshot preview"
                className="w-full rounded-md"
              />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(selectedScreenshot.timestamp), "PPpp")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedScreenshot.windowTitle}
                  </p>
                </div>
                {selectedScreenshot.isBlurred && (
                  <Badge variant="secondary">Blurred</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}