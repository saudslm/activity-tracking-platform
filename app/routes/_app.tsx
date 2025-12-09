// ============================================
// FILE: app/routes/_app.tsx (SHADCN VERSION)
// ============================================
import {
  IconLayoutDashboard,
  IconUsers,
  IconPhoto,
  IconChartBar,
  IconSettings,
  IconLogout,
  IconChevronDown,
} from "@tabler/icons-react";
import { Outlet, useNavigate, redirect, NavLink as RouterNavLink, useLocation, LoaderFunctionArgs, useLoaderData } from "react-router";
import { getSession } from "~/lib/session.server";
import { db } from "~/lib/db.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const token = session.get("token");
  const userId = session.get("userId");

  if (!token || !userId) {
    return redirect("/login");
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return redirect("/login");
  }

  return { user };
}

function SidebarNavItem({ 
  icon: Icon, 
  label, 
  href,
  isActive 
}: { 
  icon: any; 
  label: string; 
  href: string;
  isActive: boolean;
}) {
  return (
    <RouterNavLink
      to={href}
      className={cn(
        "flex items-center gap-3 px-2 py-1.5 rounded text-sm font-medium transition-colors",
        "sidebar-nav-item",
        isActive 
          ? "text-notion-text bg-black/[0.03]" 
          : "text-notion-secondary hover:text-notion-text"
      )}
    >
      <Icon size={18} strokeWidth={1.5} />
      <span>{label}</span>
    </RouterNavLink>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderData = useLoaderData<typeof loader>();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    navigate("/login");
  };

  const navItems = [
    { icon: IconLayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: IconUsers, label: "Team", href: "/team", roles: ["admin", "manager"] },
    { icon: IconPhoto, label: "Screenshots", href: "/screenshots" },
    { icon: IconChartBar, label: "Reports", href: "/reports" },
    { icon: IconSettings, label: "Settings", href: "/settings" },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(loaderData.user.role)
  );

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-notion-bg border-r border-notion-border p-3 flex flex-col">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-between w-full p-2 rounded hover:bg-black/[0.024] transition-colors mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-notion-text text-white text-xs">
                    {loaderData.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-notion-text truncate">
                    {loaderData.user.name}
                  </p>
                  <p className="text-xs text-notion-secondary truncate">
                    Workspace
                  </p>
                </div>
              </div>
              <IconChevronDown size={16} className="text-notion-secondary flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel className="text-notion-secondary">
              {loaderData.user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <IconSettings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <IconLogout className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="my-3 bg-notion-border" />

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {filteredNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={location.pathname === item.href}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}