// ============================================
// FILE: app/db/schema.ts (UPDATED - Multi-Tenant Ready)
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

// Invitations
export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().$type<"admin" | "manager" | "employee">(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  invitedBy: uuid("invited_by").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending").$type<"pending" | "accepted" | "cancelled" | "expired">(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (table) => ({
  orgIdx: index("invitations_org_idx").on(table.organizationId),
  tokenIdx: index("invitations_token_idx").on(table.token),
  statusIdx: index("invitations_status_idx").on(table.status),
  orgStatusIdx: index("invitations_org_status_idx").on(table.organizationId, table.status),
}));

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

// Time Entries (✅ UPDATED - Added organizationId)
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }), // ✅ ADDED
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  clickupTaskId: text("clickup_task_id"),
  clickupProjectId: text("clickup_project_id"),
  activityPercentage: real("activity_percentage").default(0),
  mouseClicks: integer("mouse_clicks").default(0),
  keyboardStrokes: integer("keyboard_strokes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // ✅ UPDATED - Added composite indexes with organizationId
  orgUserIdx: index("time_entries_org_user_idx").on(table.organizationId, table.userId),
  orgStartTimeIdx: index("time_entries_org_start_time_idx").on(table.organizationId, table.startTime),
  orgUserStartTimeIdx: index("time_entries_org_user_start_time_idx").on(table.organizationId, table.userId, table.startTime),
  userIdx: index("time_entries_user_idx").on(table.userId),
  startTimeIdx: index("time_entries_start_time_idx").on(table.startTime),
  taskIdx: index("time_entries_task_idx").on(table.clickupTaskId),
}));

// Screenshots (✅ UPDATED - Added organizationId)
export const screenshots = pgTable("screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  timeEntryId: uuid("time_entry_id").notNull().references(() => timeEntries.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }), // ✅ ADDED
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
  // ✅ UPDATED - Added composite indexes with organizationId
  orgUserTimestampIdx: index("screenshots_org_user_timestamp_idx").on(table.organizationId, table.userId, table.timestamp),
  orgTimestampIdx: index("screenshots_org_timestamp_idx").on(table.organizationId, table.timestamp),
  orgUserIdx: index("screenshots_org_user_idx").on(table.organizationId, table.userId),
  userIdx: index("screenshots_user_idx").on(table.userId),
  timeEntryIdx: index("screenshots_time_entry_idx").on(table.timeEntryId),
  timestampIdx: index("screenshots_timestamp_idx").on(table.timestamp),
}));

// Main integrations table
export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  provider: text("provider").notNull().$type<"clickup" | "asana" | "jira" | "linear" | "github" | "gitlab">(),
  providerAccountId: text("provider_account_id"),
  
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  scope: text("scope"),
  metadata: jsonb("metadata"),
  
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED indexes
  orgProviderIdx: index("integrations_org_provider_idx").on(table.organizationId, table.provider),
  orgActiveIdx: index("integrations_org_active_idx").on(table.organizationId, table.isActive),
  orgIdx: index("integrations_org_idx").on(table.organizationId),
}));

// Integration configurations
export const integrationConfigs = pgTable("integration_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED indexes
  integrationKeyIdx: index("integration_configs_integration_key_idx").on(table.integrationId, table.key),
  integrationIdx: index("integration_configs_integration_idx").on(table.integrationId),
}));

// Synced resources
export const syncedResources = pgTable("synced_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  
  resourceType: text("resource_type").notNull().$type<"container" | "project" | "collection" | "task">(),
  externalId: text("external_id").notNull(),
  
  parentId: uuid("parent_id"),
  level: integer("level").notNull().default(0),
  path: text("path"),
  
  name: text("name").notNull(),
  status: text("status"),
  isSelectable: boolean("is_selectable").notNull().default(true),
  providerType: text("provider_type"),
  
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  timesAccessed: integer("times_accessed").default(0),
  
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
  syncStatus: text("sync_status").notNull().default("synced").$type<"synced" | "pending" | "error">(),
  syncError: text("sync_error"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED comprehensive indexes
  orgIntegrationIdx: index("synced_resources_org_integration_idx").on(table.organizationId, table.integrationId),
  orgIntegrationTypeIdx: index("synced_resources_org_integration_type_idx").on(table.organizationId, table.integrationId, table.resourceType),
  orgIntegrationTypeSelectableIdx: index("synced_resources_org_integration_type_selectable_idx").on(table.organizationId, table.integrationId, table.resourceType, table.isSelectable),
  parentIdx: index("synced_resources_parent_idx").on(table.parentId),
  externalIdx: index("synced_resources_external_idx").on(table.organizationId, table.integrationId, table.externalId),
  levelIdx: index("synced_resources_level_idx").on(table.organizationId, table.integrationId, table.level),
  cleanupIdx: index("synced_resources_cleanup_idx").on(table.expiresAt, table.lastAccessedAt),
}));

// Synced resource data
export const syncedResourceData = pgTable("synced_resource_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  resourceId: uuid("resource_id").notNull().references(() => syncedResources.id, { onDelete: "cascade" }).unique(),
  
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  data: jsonb("data"),
  metadata: jsonb("metadata"),
  
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  resourceIdx: index("synced_resource_data_resource_idx").on(table.resourceId),
}));

// Favorite resources
export const favoriteResources = pgTable("favorite_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resourceId: uuid("resource_id").notNull().references(() => syncedResources.id, { onDelete: "cascade" }),
  order: integer("order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED indexes
  userIdx: index("favorite_resources_user_idx").on(table.userId),
  resourceIdx: index("favorite_resources_resource_idx").on(table.resourceId),
}));

// Recent resources
export const recentResources = pgTable("recent_resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resourceId: uuid("resource_id").notNull().references(() => syncedResources.id, { onDelete: "cascade" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
  useCount: integer("use_count").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED indexes
  userIdx: index("recent_resources_user_idx").on(table.userId),
  userLastUsedIdx: index("recent_resources_user_last_used_idx").on(table.userId, table.lastUsedAt),
  resourceIdx: index("recent_resources_resource_idx").on(table.resourceId),
}));

// User integration preferences
export const userIntegrationPreferences = pgTable("user_integration_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  defaultContainerId: uuid("default_container_id").references(() => syncedResources.id, { onDelete: "set null" }),
  defaultProjectId: uuid("default_project_id").references(() => syncedResources.id, { onDelete: "set null" }),
  defaultCollectionId: uuid("default_collection_id").references(() => syncedResources.id, { onDelete: "set null" }),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED indexes
  userIdx: index("user_integration_preferences_user_idx").on(table.userId),
  integrationIdx: index("user_integration_preferences_integration_idx").on(table.integrationId),
}));

// Time entry mappings (✅ UPDATED - Added organizationId)
export const timeEntryMappings = pgTable("time_entry_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  timeEntryId: uuid("time_entry_id").notNull().references(() => timeEntries.id, { onDelete: "cascade" }),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }), // ✅ ADDED
  
  externalTaskId: text("external_task_id").notNull(),
  externalTaskName: text("external_task_name"),
  
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  syncStatus: text("sync_status").default("pending").$type<"pending" | "synced" | "failed">(),
  syncError: text("sync_error"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // ✅ ADDED composite indexes with organizationId
  orgTimeEntryIdx: index("time_entry_mappings_org_time_entry_idx").on(table.organizationId, table.timeEntryId),
  orgIntegrationIdx: index("time_entry_mappings_org_integration_idx").on(table.organizationId, table.integrationId),
  timeEntryIdx: index("time_entry_mappings_time_entry_idx").on(table.timeEntryId),
  integrationIdx: index("time_entry_mappings_integration_idx").on(table.integrationId),
  externalTaskIdx: index("time_entry_mappings_external_task_idx").on(table.externalTaskId),
}));

// ============================================
// Relations
// ============================================

export const syncedResourcesRelations = relations(syncedResources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [syncedResources.organizationId],
    references: [organizations.id],
  }),
  integration: one(integrations, {
    fields: [syncedResources.integrationId],
    references: [integrations.id],
  }),
  parent: one(syncedResources, {
    fields: [syncedResources.parentId],
    references: [syncedResources.id],
  }),
  children: many(syncedResources),
  data: one(syncedResourceData, {
    fields: [syncedResources.id],
    references: [syncedResourceData.resourceId],
  }),
  favorites: many(favoriteResources),
  recentUsage: many(recentResources),
}));

export const syncedResourceDataRelations = relations(syncedResourceData, ({ one }) => ({
  resource: one(syncedResources, {
    fields: [syncedResourceData.resourceId],
    references: [syncedResources.id],
  }),
}));

export const favoriteResourcesRelations = relations(favoriteResources, ({ one }) => ({
  user: one(users, {
    fields: [favoriteResources.userId],
    references: [users.id],
  }),
  resource: one(syncedResources, {
    fields: [favoriteResources.resourceId],
    references: [syncedResources.id],
  }),
}));

export const recentResourcesRelations = relations(recentResources, ({ one }) => ({
  user: one(users, {
    fields: [recentResources.userId],
    references: [users.id],
  }),
  resource: one(syncedResources, {
    fields: [recentResources.resourceId],
    references: [syncedResources.id],
  }),
}));

export const userIntegrationPreferencesRelations = relations(userIntegrationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userIntegrationPreferences.userId],
    references: [users.id],
  }),
  integration: one(integrations, {
    fields: [userIntegrationPreferences.integrationId],
    references: [integrations.id],
  }),
  defaultContainer: one(syncedResources, {
    fields: [userIntegrationPreferences.defaultContainerId],
    references: [syncedResources.id],
  }),
  defaultProject: one(syncedResources, {
    fields: [userIntegrationPreferences.defaultProjectId],
    references: [syncedResources.id],
  }),
  defaultCollection: one(syncedResources, {
    fields: [userIntegrationPreferences.defaultCollectionId],
    references: [syncedResources.id],
  }),
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
  organization: one(organizations, {
    fields: [timeEntries.organizationId],
    references: [organizations.id],
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
  organization: one(organizations, {
    fields: [screenshots.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================
// TypeScript Types
// ============================================

export type Organization = typeof organizations.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type User = typeof users.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type Screenshot = typeof screenshots.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type SyncedResource = typeof syncedResources.$inferSelect;
export type SyncedResourceData = typeof syncedResourceData.$inferSelect;
export type FavoriteResource = typeof favoriteResources.$inferSelect;
export type RecentResource = typeof recentResources.$inferSelect;
export type UserIntegrationPreference = typeof userIntegrationPreferences.$inferSelect;
export type TimeEntryMapping = typeof timeEntryMappings.$inferSelect;
