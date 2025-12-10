// ============================================
// FILE: app/routes/_app.settings.privacy.tsx (MIGRATED TO SHADCN/UI)
// ============================================
import { LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function PrivacySettings() {
  return (
    <Card className="border-notion-border p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="blur-mode" className="text-notion-text font-semibold">
            Screenshot Blur Mode
          </Label>
          <Select>
            <SelectTrigger id="blur-mode">
              <SelectValue placeholder="Select blur mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always blur screenshots</SelectItem>
              <SelectItem value="optional">Let employees choose</SelectItem>
              <SelectItem value="never">Never blur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-4 py-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="allow-delete" className="text-notion-text font-semibold cursor-pointer">
              Allow employees to delete screenshots
            </Label>
            <p className="text-xs text-notion-secondary">
              Within the grace period set below
            </p>
          </div>
          <Switch id="allow-delete" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grace-period" className="text-notion-text font-semibold">
            Delete Grace Period (minutes)
          </Label>
          <Input
            id="grace-period"
            type="number"
            placeholder="5"
            defaultValue=""
          />
        </div>

        <Button className="bg-[#2383E2] hover:bg-[#1d6bc4] font-medium">
          Save changes
        </Button>
      </div>
    </Card>
  );
}