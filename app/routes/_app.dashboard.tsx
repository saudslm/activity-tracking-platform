// ============================================
// FILE: app/routes/_app.dashboard.tsx (SHADCN VERSION)
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
import { timeEntries, screenshots } from "~/db/schema";
import { eq, and, gte, sql, lt } from "drizzle-orm";
import { startOfDay, endOfDay, format, subDays } from "date-fns";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  const today = new Date();
  const startOfToday = startOfDay(today);

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
        eq(timeEntries.userId, userId),
        gte(timeEntries.startTime, startOfToday)
      )
    );

  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [dayData] = await db
      .select({
        minutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60), 0)`,
      })
      .from(timeEntries)
      .where(
        and(
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
        <h1 className="text-[40px] font-bold text-notion-text mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-notion-secondary">
          Track your productivity and activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Hours Today */}
        <Card className="stat-card border-notion-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <IconClock size={20} className="text-blue-600" strokeWidth={1.5} />
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  TODAY
                </Badge>
              </div>
              <div>
                <p className="text-[32px] font-bold text-notion-text leading-none">
                  {loaderData.todayHours}
                </p>
                <p className="text-sm text-notion-secondary mt-1">
                  Hours tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Level */}
        <Card className="stat-card border-notion-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative h-24 w-24">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E9E9E7"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#14B8A6"
                    strokeWidth="8"
                    strokeDasharray={`${loaderData.avgActivity * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-notion-text">
                    {loaderData.avgActivity}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-notion-secondary">
                Activity level
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Screenshots */}
        <Card className="stat-card border-notion-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <IconPhoto size={20} className="text-violet-600" strokeWidth={1.5} />
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  CAPTURED
                </Badge>
              </div>
              <div>
                <p className="text-[32px] font-bold text-notion-text leading-none">
                  {loaderData.screenshotCount}
                </p>
                <p className="text-sm text-notion-secondary mt-1">
                  Screenshots
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productivity */}
        <Card className="stat-card border-notion-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <IconTrendingUp size={20} className="text-green-600" strokeWidth={1.5} />
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  STATUS
                </Badge>
              </div>
              <div>
                <p className="text-[32px] font-bold text-notion-text leading-none">
                  {loaderData.avgActivity > 70 ? "High" : "Medium"}
                </p>
                <p className="text-sm text-notion-secondary mt-1">
                  Productivity
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-notion-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-notion-text">
            Last 7 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={loaderData.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9E9E7" />
              <XAxis 
                dataKey="date" 
                stroke="#787774"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#787774"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #E9E9E7',
                  borderRadius: '6px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#2383E2" 
                strokeWidth={2}
                dot={{ fill: '#2383E2', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}