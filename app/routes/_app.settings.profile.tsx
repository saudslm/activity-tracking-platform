// ============================================
// FILE: app/routes/_app.settings.profile.tsx (MIGRATED TO SHADCN/UI)
// ============================================
import { LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function ProfileSettings() {
  return (
    <Card className="border-notion-border p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-notion-text font-semibold">
            Full Name
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            defaultValue=""
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-notion-text font-semibold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
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