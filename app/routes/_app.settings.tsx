// ============================================
// FILE: app/routes/_app.settings.tsx
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
        <h1 className="text-4xl font-bold text-[#37352F] mb-1">Settings</h1>
        <p className="text-sm text-[#787774]">
          Manage your account and organization preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={location.pathname}
        onValueChange={(value) => navigate(value)}
      >
        <TabsList className="border-b border-[#E9E9E7] rounded-none h-auto p-0">
          <TabsTrigger
            value="/settings/profile"
            className="px-4 py-3 text-[#787774] font-medium data-[state=active]:text-[#37352F] 
                       data-[state=active]:border-b-2 data-[state=active]:border-[#37352F]
                       rounded-none hover:bg-transparent hover:text-[#37352F]"
          >
            Profile
          </TabsTrigger>

          <TabsTrigger
            value="/settings/organization"
            className="px-4 py-3 text-[#787774] font-medium data-[state=active]:text-[#37352F] 
                       data-[state=active]:border-b-2 data-[state=active]:border-[#37352F]
                       rounded-none hover:bg-transparent hover:text-[#37352F]"
          >
            Organization
          </TabsTrigger>

          <TabsTrigger
            value="/settings/privacy"
            className="px-4 py-3 text-[#787774] font-medium data-[state=active]:text-[#37352F] 
                       data-[state=active]:border-b-2 data-[state=active]:border-[#37352F]
                       rounded-none hover:bg-transparent hover:text-[#37352F]"
          >
            Privacy
          </TabsTrigger>

          <TabsTrigger
            value="/settings/clickup"
            className="px-4 py-3 text-[#787774] font-medium data-[state=active]:text-[#37352F] 
                       data-[state=active]:border-b-2 data-[state=active]:border-[#37352F]
                       rounded-none hover:bg-transparent hover:text-[#37352F]"
          >
            ClickUp
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Nested pages */}
      <Outlet />
    </div>
  );
}
