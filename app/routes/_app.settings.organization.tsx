// ============================================
// FILE: app/routes/_app.settings.organization.tsx (YELLOW THEME)
// ============================================
import { LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function OrganizationSettings() {
  return (
    <Card className="border-border p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="org-name" className="text-foreground font-semibold">
            Organization Name
          </Label>
          <Input
            id="org-name"
            placeholder="Acme Inc"
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