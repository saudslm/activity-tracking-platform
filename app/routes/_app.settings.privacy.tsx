// ============================================
// FILE: app/routes/_app.settings.privacy.tsx (YELLOW THEME)
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
    <Card className="border-border p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="blur-mode" className="text-foreground font-semibold">
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
            <Label htmlFor="allow-delete" className="text-foreground font-semibold cursor-pointer">
              Allow employees to delete screenshots
            </Label>
            <p className="text-xs text-muted-foreground">
              Within the grace period set below
            </p>
          </div>
          <Switch id="allow-delete" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grace-period" className="text-foreground font-semibold">
            Delete Grace Period (minutes)
          </Label>
          <Input
            id="grace-period"
            type="number"
            placeholder="5"
            defaultValue=""
          />
        </div>

        <Button>
          Save changes
        </Button>
      </div>
    </Card>
  );
}