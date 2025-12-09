// ============================================
// FILE: app/routes.ts
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

  // Protected routes with layout
  layout("./routes/_app.tsx", [
    index("./routes/_app._index.tsx"),
    route("dashboard", "./routes/_app.dashboard.tsx"),
    route("team", "./routes/_app.team.tsx"),
    route("screenshots", "./routes/_app.screenshots.tsx"),
    route("reports", "./routes/_app.reports.tsx"),
    route("settings", "./routes/_app.settings.tsx"),
    
    // Settings sub-routes
    route("settings/profile", "./routes/_app.settings.profile.tsx"),
    route("settings/organization", "./routes/_app.settings.organization.tsx"),
    route("settings/clickup", "./routes/_app.settings.clickup.tsx"),
    route("settings/privacy", "./routes/_app.settings.privacy.tsx"),
  ]),

  // API routes
  route("api/activity", "./routes/api/activity.tsx"),
  route("api/screenshots", "./routes/api/screenshots.tsx"),
  route("api/clickup/callback", "./routes/api/clickup.callback.tsx"),
  route("api/clickup/sync", "./routes/api/clickup.sync.tsx"),
  route("api/logout", "./routes/api/logout.tsx"),
] satisfies RouteConfig;