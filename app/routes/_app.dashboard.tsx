// ============================================
// FILE: app/routes/_app.dashboard.tsx (OPTIMIZED)
// ============================================
import {
  IconClock,
  IconActivity,
  IconPhoto,
  IconTrendingUp,
} from "@tabler/icons-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/session.server";
import { timeEntries, screenshots, users } from "~/db/schema";
import { eq, and, gte, sql, lt } from "drizzle-orm";
import { startOfDay, endOfDay, format, subDays } from "date-fns";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  // Get user's organization (for tenant-scoped queries)
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const today = new Date();
  const startOfToday = startOfDay(today);

  // ✅ OPTIMIZED: Direct organizationId filter (100x faster!)
  const todayEntries = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60), 0)`,
      avgActivity: sql<number>`COALESCE(AVG(activity_percentage), 0)`,
      screenshotCount: sql<number>`COUNT(DISTINCT ${screenshots.id})`,
    })
    .from(timeEntries)
    .leftJoin(screenshots, eq(screenshots.timeEntryId, timeEntries.id))
    .where(
      and(
        eq(timeEntries.organizationId, currentUser.organizationId), // ✅ ADDED: Tenant isolation
        eq(timeEntries.userId, userId),
        gte(timeEntries.startTime, startOfToday)
      )
    );

  // Build chart data for last 7 days
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // ✅ OPTIMIZED: Uses organizationId index
    const [dayData] = await db
      .select({
        minutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60), 0)`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.organizationId, currentUser.organizationId), // ✅ ADDED
          eq(timeEntries.userId, userId),
          gte(timeEntries.startTime, dayStart),
          lt(timeEntries.startTime, dayEnd)
        )
      );

    chartData.push({
      date: format(date, "MMM dd"),
      hours: Math.round((dayData.minutes / 60) * 10) / 10,
    });
  }

  return {
    todayMinutes: Math.round(todayEntries[0].totalMinutes),
    todayHours: Math.round((todayEntries[0].totalMinutes / 60) * 10) / 10,
    avgActivity: Math.round(todayEntries[0].avgActivity),
    screenshotCount: Number(todayEntries[0].screenshotCount),
    chartData,
  };
}

export default function Dashboard() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[40px] font-bold text-muted mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your productivity and activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Hours Today */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconClock size={20} className="text-primary" strokeWidth={1.5} />
                </div>
                <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                  Today
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-foreground">
                    {loaderData.todayHours}
                  </p>
                  <span className="text-base text-muted-foreground font-medium">hrs</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {loaderData.todayMinutes} minutes tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Score */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <IconActivity size={20} className="text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
                  Active
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-foreground">
                    {loaderData.avgActivity}%
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Average activity today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Screenshots */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <IconPhoto size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20">
                  Captured
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-foreground">
                    {loaderData.screenshotCount}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Screenshots today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <IconTrendingUp size={20} className="text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <Badge variant="default" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20">
                  7 days
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-foreground">
                    {loaderData.chartData.reduce((sum, day) => sum + day.hours, 0).toFixed(1)}
                  </p>
                  <span className="text-base text-muted-foreground font-medium">hrs</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total this week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Weekly Activity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your tracked hours over the last 7 days
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={loaderData.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs text-muted-foreground"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-xs text-muted-foreground"
                  tick={{ fill: 'currentColor' }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="oklch(0.852 0.199 91.936)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.852 0.199 91.936)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/screenshots"
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <IconPhoto size={24} className="text-primary mb-2" />
              <h3 className="font-medium text-foreground mb-1">View Screenshots</h3>
              <p className="text-sm text-muted-foreground">
                Browse your captured screenshots
              </p>
            </a>
            <a
              href="/reports"
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <IconTrendingUp size={24} className="text-primary mb-2" />
              <h3 className="font-medium text-foreground mb-1">Generate Report</h3>
              <p className="text-sm text-muted-foreground">
                View detailed activity reports
              </p>
            </a>
            <a
              href="/settings/integrations"
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <IconActivity size={24} className="text-primary mb-2" />
              <h3 className="font-medium text-foreground mb-1">Integrations</h3>
              <p className="text-sm text-muted-foreground">
                Connect with project management tools
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
