// ============================================
// FILE: app/routes.ts (FIXED - No Duplicates)
// ============================================
import {
  type RouteConfig,
  route,
  index,
  layout,
} from "@react-router/dev/routes";

export default [
  // Public routes
  route("login", "./routes/auth/login.tsx"),
  route("register", "./routes/auth/register.tsx"),
  route("accept-invitation/:token", "./routes/accept-invitation.$token.tsx"),

  // Integration OAuth routes
  route("api/integrations/:provider/connect", "./routes/api/integrations.$provider.connect.tsx"),
  route("api/integrations/:provider/callback", "./routes/api/integrations.$provider.callback.tsx"),
  route("api/integrations/:provider/disconnect", "./routes/api/integrations.$provider.disconnect.tsx"),
  route("api/integrations/:provider/sync", "./routes/api/integrations.$provider.sync.tsx"),

  // Protected routes with layout
  layout("./routes/_app.tsx", [
    index("./routes/_app._index.tsx"),
    route("dashboard", "./routes/_app.dashboard.tsx"),
    route("team", "./routes/_app.team.tsx"),
    route("screenshots", "./routes/_app.screenshots.tsx"),
    route("reports", "./routes/_app.reports.tsx"),
    
    // Settings parent with nested children
    layout("./routes/_app.settings.tsx", [
      route("/settings/profile", "./routes/_app.settings.profile.tsx"),
      route("/settings/organization", "./routes/_app.settings.organization.tsx"),
      route("/settings/privacy", "./routes/_app.settings.privacy.tsx"),
      route("/settings/integrations", "./routes/_app.settings.integrations.tsx"),
    ]),
  ]),

  // API routes
  route("api/activity", "./routes/api/activity.tsx"),
  route("api/screenshots", "./routes/api/screenshots.tsx"),
  route("api/logout", "./routes/api/logout.tsx"),
] satisfies RouteConfig;
