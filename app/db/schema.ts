// ============================================
// FILE: app/db/schema.ts
// ============================================
import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, real, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Organizations
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  settings: jsonb("settings").$type<{
    blurMode: "always" | "optional" | "never";
    screenshotInterval: number;
    screenshotRetention: number;
    allowScreenshotDelete: boolean;
    deleteGracePeriod: number;
  }>().default({
    blurMode: "optional",
    screenshotInterval: 600,
    screenshotRetention: 30,
    allowScreenshotDelete: true,
    deleteGracePeriod: 5,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<"admin" | "manager" | "employee">().notNull().default("employee"),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  canBlurScreenshots: boolean("can_blur_screenshots").default(false),
  isActive: boolean("is_active").default(true),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  orgIdx: index("users_org_idx").on(table.organizationId),
}));

// Time Entries
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  clickupTaskId: text("clickup_task_id"),
  clickupProjectId: text("clickup_project_id"),
  activityPercentage: real("activity_percentage").default(0),
  mouseClicks: integer("mouse_clicks").default(0),
  keyboardStrokes: integer("keyboard_strokes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("time_entries_user_idx").on(table.userId),
  startTimeIdx: index("time_entries_start_time_idx").on(table.startTime),
  taskIdx: index("time_entries_task_idx").on(table.clickupTaskId),
}));

// Screenshots (stored in Cloudflare R2)
export const screenshots = pgTable("screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  timeEntryId: uuid("time_entry_id").notNull().references(() => timeEntries.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull(),
  r2KeyOriginal: text("r2_key_original").notNull(),
  r2KeyBlurred: text("r2_key_blurred"),
  isBlurred: boolean("is_blurred").default(false),
  isDeleted: boolean("is_deleted").default(false),
  windowTitle: text("window_title"),
  applicationName: text("application_name"),
  metadata: jsonb("metadata").$type<{
    width?: number;
    height?: number;
    fileSize?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("screenshots_user_idx").on(table.userId),
  timeEntryIdx: index("screenshots_time_entry_idx").on(table.timeEntryId),
  timestampIdx: index("screenshots_timestamp_idx").on(table.timestamp),
}));

// ClickUp Workspaces
export const clickupWorkspaces = pgTable("clickup_workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),
  workspaceName: text("workspace_name").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("clickup_workspaces_org_idx").on(table.organizationId),
}));

// ClickUp Projects
export const clickupProjects = pgTable("clickup_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => clickupWorkspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().unique(),
  name: text("name").notNull(),
  status: text("status"),
  color: text("color"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index("clickup_projects_workspace_idx").on(table.workspaceId),
  projectIdIdx: index("clickup_projects_project_id_idx").on(table.projectId),
}));

// ClickUp Tasks
export const clickupTasks = pgTable("clickup_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => clickupProjects.id, { onDelete: "cascade" }),
  taskId: text("task_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status"),
  priority: text("priority"),
  assignees: jsonb("assignees").$type<string[]>().default([]),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("clickup_tasks_project_idx").on(table.projectId),
  taskIdIdx: index("clickup_tasks_task_id_idx").on(table.taskId),
}));

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  clickupWorkspaces: many(clickupWorkspaces),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  timeEntries: many(timeEntries),
  screenshots: many(screenshots),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  screenshots: many(screenshots),
}));

export const screenshotsRelations = relations(screenshots, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [screenshots.timeEntryId],
    references: [timeEntries.id],
  }),
  user: one(users, {
    fields: [screenshots.userId],
    references: [users.id],
  }),
}));

export const clickupWorkspacesRelations = relations(clickupWorkspaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clickupWorkspaces.organizationId],
    references: [organizations.id],
  }),
  projects: many(clickupProjects),
}));

export const clickupProjectsRelations = relations(clickupProjects, ({ one, many }) => ({
  workspace: one(clickupWorkspaces, {
    fields: [clickupProjects.workspaceId],
    references: [clickupWorkspaces.id],
  }),
  tasks: many(clickupTasks),
}));

export const clickupTasksRelations = relations(clickupTasks, ({ one }) => ({
  project: one(clickupProjects, {
    fields: [clickupTasks.projectId],
    references: [clickupProjects.id],
  }),
}));