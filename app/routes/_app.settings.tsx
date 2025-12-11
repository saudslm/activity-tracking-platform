// ============================================
// FILE: app/routes/_app.settings.tsx (YELLOW THEME)
// ============================================
import { LoaderFunctionArgs, Outlet, useLoaderData, useLocation, useNavigate } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-[40px] font-bold text-muted mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and organization preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={location.pathname}
        onValueChange={(value) => navigate(value)}
      >
        <TabsList className="border-b border-border rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger
            value="/settings/profile"
            className="px-4 py-3 text-muted-foreground font-medium data-[state=active]:text-foreground 
                       data-[state=active]:border-b-2 data-[state=active]:border-primary
                       rounded-none hover:bg-transparent hover:text-foreground bg-transparent"
          >
            Profile
          </TabsTrigger>

          <TabsTrigger
            value="/settings/organization"
            className="px-4 py-3 text-muted-foreground font-medium data-[state=active]:text-foreground 
                       data-[state=active]:border-b-2 data-[state=active]:border-primary
                       rounded-none hover:bg-transparent hover:text-foreground bg-transparent"
          >
            Organization
          </TabsTrigger>

          <TabsTrigger
            value="/settings/privacy"
            className="px-4 py-3 text-muted-foreground font-medium data-[state=active]:text-foreground 
                       data-[state=active]:border-b-2 data-[state=active]:border-primary
                       rounded-none hover:bg-transparent hover:text-foreground bg-transparent"
          >
            Privacy
          </TabsTrigger>

          <TabsTrigger
            value="/settings/integrations"
            className="px-4 py-3 text-muted-foreground font-medium data-[state=active]:text-foreground 
                       data-[state=active]:border-b-2 data-[state=active]:border-primary
                       rounded-none hover:bg-transparent hover:text-foreground bg-transparent"
          >
            Integrations
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Nested pages */}
      <Outlet />
    </div>
  );
}