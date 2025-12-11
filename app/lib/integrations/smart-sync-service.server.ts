// ============================================
// FILE: app/lib/integrations/smart-sync-service.server.ts
// ============================================
import { db } from "~/lib/db.server";
import { syncedResources, syncedResourceData, recentResources, userIntegrationPreferences, integrations } from "~/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getProvider, ProviderType } from "./provider-registry";
import type { Workspace, Project, Task } from "./base-provider";

// Resource type for syncing (combines all resource types)
type Resource = (Workspace | Project | Task) & {
  type: "container" | "project" | "collection" | "task";
  providerType: string;
  parentId?: string;
  level: number;
  path: string;
  isSelectable: boolean;
  metadata?: Record<string, any>;
};

// Simple in-memory cache for development (use Redis in production)
const cache = new Map<string, { data: any; expires: number }>();

export class SmartSyncService {
  // Cache TTL in seconds
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MAX_RESOURCES_PER_LEVEL = 100; // Don't sync more than 100 items per level

  /**
   * Sync resources from integration (smart - only what's needed)
   */
  async syncIntegration(params: {
    integrationId: string;
    organizationId: string;
    accessToken: string;
    provider: ProviderType;
    full?: boolean; // Force full sync
  }) {
    const { integrationId, organizationId, accessToken, provider: providerType, full = false } = params;

    const provider = getProvider(providerType);
    const hierarchy = provider.getHierarchy();

    console.log(`🔄 Starting ${full ? 'full' : 'smart'} sync for ${providerType}...`);

    const stats = {
      containers: 0,
      projects: 0,
      collections: 0,
      tasks: 0,
    };

    try {
      // 1. Sync containers (workspaces/teams)
      if (hierarchy.supports.containers) {
        const containers = await provider.fetchWorkspaces(accessToken);
        stats.containers = await this.syncResources({
          organizationId,
          integrationId,
          resources: containers,
          resourceType: "container",
          level: 0,
        });
      }

      // 2. For smart sync, only sync projects from first container
      const containersToSync = full
        ? await this.getResources(organizationId, integrationId, "container")
        : await this.getResources(organizationId, integrationId, "container", 1);

      if (hierarchy.supports.projects) {
        for (const container of containersToSync) {
          const projects = await provider.fetchProjects(accessToken, container.externalId);
          stats.projects += await this.syncResources({
            organizationId,
            integrationId,
            resources: projects,
            resourceType: "project",
            parentId: container.id,
            level: 1,
          });
        }
      }

      // 3. For smart sync, only sync collections from first 5 projects
      const projectsToSync = full
        ? await this.getResources(organizationId, integrationId, "project")
        : await this.getResources(organizationId, integrationId, "project", 5);

      if (hierarchy.supports.collections) {
        for (const project of projectsToSync) {
          const collections = await provider.fetchCollections(accessToken, project.externalId);
          stats.collections += await this.syncResources({
            organizationId,
            integrationId,
            resources: collections,
            resourceType: "collection",
            parentId: project.id,
            level: 2,
          });
        }
      }

      // 4. For smart sync, only sync tasks from first 5 collections
      const collectionsToSync = full
        ? await this.getResources(organizationId, integrationId, "collection")
        : await this.getResources(organizationId, integrationId, "collection", 5);

      for (const collection of collectionsToSync) {
        const tasks = await provider.fetchTasks(accessToken, collection.externalId);
        // Only sync first 20 tasks per collection in smart mode
        const tasksToSync = full ? tasks : tasks.slice(0, 20);
        stats.tasks += await this.syncResources({
          organizationId,
          integrationId,
          resources: tasksToSync,
          resourceType: "task",
          parentId: collection.id,
          level: 3,
        });
      }

      // Update integration last_synced_at
      await db
        .update(integrations)
        .set({ lastSyncedAt: new Date() })
        .where(eq(integrations.id, integrationId));

      console.log(`✅ Sync complete:`, stats);
      return stats;

    } catch (error) {
      console.error(`❌ Sync failed:`, error);
      throw error;
    }
  }

  /**
   * Sync specific level on-demand (lazy loading)
   */
  async syncLevel(params: {
    integrationId: string;
    organizationId: string;
    accessToken: string;
    provider: ProviderType;
    parentId: string;
    level: "projects" | "collections" | "tasks";
  }) {
    const { integrationId, organizationId, accessToken, provider: providerType, parentId, level } = params;

    // Check cache first
    const cacheKey = `sync:${integrationId}:${parentId}:${level}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Using cached data for ${level}`);
      return cached;
    }

    const provider = getProvider(providerType);
    const parent = await this.getResourceById(parentId);

    if (!parent) {
      throw new Error("Parent resource not found");
    }

    let resources: (Workspace | Project | Task)[] = [];
    let resourceType: "project" | "collection" | "task";
    let resourceLevel: number;

    if (level === "projects") {
      resources = await provider.fetchProjects(accessToken, parent.externalId);
      resourceType = "project";
      resourceLevel = 1;
    } else if (level === "collections") {
      resources = await provider.fetchCollections(accessToken, parent.externalId);
      resourceType = "collection";
      resourceLevel = 2;
    } else {
      resources = await provider.fetchTasks(accessToken, parent.externalId);
      resourceType = "task";
      resourceLevel = 3;
    }

    const count = await this.syncResources({
      organizationId,
      integrationId,
      resources,
      resourceType,
      parentId,
      level: resourceLevel,
    });

    // Cache the result
    this.setCache(cacheKey, count);

    return count;
  }

  /**
   * Track resource usage (for smart recommendations)
   */
  async trackUsage(userId: string, resourceId: string) {
    // Update last accessed
    await db
      .update(syncedResources)
      .set({
        lastAccessedAt: new Date(),
        timesAccessed: sql`${syncedResources.timesAccessed} + 1`,
      })
      .where(eq(syncedResources.id, resourceId));

    // Add to recent resources
    const [existing] = await db
      .select()
      .from(recentResources)
      .where(
        and(
          eq(recentResources.userId, userId),
          eq(recentResources.resourceId, resourceId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(recentResources)
        .set({
          lastUsedAt: new Date(),
          useCount: sql`${recentResources.useCount} + 1`,
        })
        .where(eq(recentResources.id, existing.id));
    } else {
      await db.insert(recentResources).values({
        userId,
        resourceId,
        lastUsedAt: new Date(),
        useCount: 1,
      });
    }
  }

  /**
   * Get recent resources for user
   */
  async getRecentResources(userId: string, limit: number = 10) {
    const recent = await db
      .select({
        resource: syncedResources,
        lastUsedAt: recentResources.lastUsedAt,
        useCount: recentResources.useCount,
      })
      .from(recentResources)
      .innerJoin(syncedResources, eq(recentResources.resourceId, syncedResources.id))
      .where(eq(recentResources.userId, userId))
      .orderBy(desc(recentResources.lastUsedAt))
      .limit(limit);

    return recent;
  }

  /**
   * Search resources by name
   */
  async searchResources(params: {
    organizationId: string;
    integrationId: string;
    query: string;
    resourceType?: "container" | "project" | "collection" | "task";
    limit?: number;
  }) {
    const { organizationId, integrationId, query, resourceType, limit = 50 } = params;

    const resources = await db
      .select()
      .from(syncedResources)
      .where(
        and(
          eq(syncedResources.organizationId, organizationId),
          eq(syncedResources.integrationId, integrationId),
          resourceType ? eq(syncedResources.resourceType, resourceType) : undefined,
          sql`${syncedResources.name} ILIKE ${'%' + query + '%'}`
        )
      )
      .limit(limit);

    return resources;
  }

  /**
   * Get resource hierarchy (breadcrumb)
   */
  async getResourcePath(resourceId: string): Promise<SyncedResource[]> {
    const path: SyncedResource[] = [];
    let currentId: string | null = resourceId;

    while (currentId) {
      const [resource] = await db
        .select()
        .from(syncedResources)
        .where(eq(syncedResources.id, currentId))
        .limit(1);

      if (!resource) break;

      path.unshift(resource); // Add to beginning
      currentId = resource.parentId;
    }

    return path;
  }

  /**
   * Save user's default selections
   */
  async saveUserDefaults(params: {
    userId: string;
    integrationId: string;
    containerId?: string;
    projectId?: string;
    collectionId?: string;
  }) {
    const { userId, integrationId, containerId, projectId, collectionId } = params;

    const [existing] = await db
      .select()
      .from(userIntegrationPreferences)
      .where(
        and(
          eq(userIntegrationPreferences.userId, userId),
          eq(userIntegrationPreferences.integrationId, integrationId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(userIntegrationPreferences)
        .set({
          defaultContainerId: containerId,
          defaultProjectId: projectId,
          defaultCollectionId: collectionId,
        })
        .where(eq(userIntegrationPreferences.id, existing.id));
    } else {
      await db.insert(userIntegrationPreferences).values({
        userId,
        integrationId,
        defaultContainerId: containerId,
        defaultProjectId: projectId,
        defaultCollectionId: collectionId,
      });
    }
  }

  // ========== Private Helper Methods ==========

  private async syncResources(params: {
    organizationId: string;
    integrationId: string;
    resources: (Workspace | Project | Task)[];
    resourceType: "container" | "project" | "collection" | "task";
    parentId?: string;
    level: number;
  }): Promise<number> {
    const { organizationId, integrationId, resources, resourceType, parentId, level } = params;

    if (resources.length === 0) return 0;

    // Limit number of resources to prevent database bloat
    const resourcesToSync = resources.slice(0, this.MAX_RESOURCES_PER_LEVEL);

    for (const resource of resourcesToSync) {
      // Build path for breadcrumb
      const parentPath = parentId
        ? ((await this.getResourceById(parentId))?.path || "")
        : "";
      const path = `${parentPath}/${resource.id}`;

      // Determine provider type based on resource
      let providerType = resourceType;
      if ('metadata' in resource && resource.metadata) {
        // Extract provider-specific type from metadata if available
        providerType = (resource.metadata as any).providerType || resourceType;
      }

      await db
        .insert(syncedResources)
        .values({
          organizationId,
          integrationId,
          resourceType,
          externalId: resource.id,
          parentId,
          level,
          path,
          name: resource.name,
          providerType,
          isSelectable: resourceType === 'task' || resourceType === 'collection',
          lastSyncedAt: new Date(),
          syncStatus: "synced",
        })
        .onConflictDoUpdate({
          target: [syncedResources.organizationId, syncedResources.integrationId, syncedResources.externalId],
          set: {
            name: resource.name,
            parentId,
            level,
            path,
            lastSyncedAt: new Date(),
            syncStatus: "synced",
            updatedAt: new Date(),
          },
        });
    }

    return resourcesToSync.length;
  }

  private async getResources(
    organizationId: string,
    integrationId: string,
    resourceType: "container" | "project" | "collection" | "task",
    limit?: number
  ) {
    const query = db
      .select()
      .from(syncedResources)
      .where(
        and(
          eq(syncedResources.organizationId, organizationId),
          eq(syncedResources.integrationId, integrationId),
          eq(syncedResources.resourceType, resourceType)
        )
      );

    if (limit) {
      query.limit(limit);
    }

    return query;
  }

  private async getResourceById(resourceId: string) {
    const [resource] = await db
      .select()
      .from(syncedResources)
      .where(eq(syncedResources.id, resourceId))
      .limit(1);

    return resource;
  }

  private getFromCache(key: string): any {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any) {
    cache.set(key, {
      data,
      expires: Date.now() + (this.CACHE_TTL * 1000),
    });
  }
}

export const smartSyncService = new SmartSyncService();

// Type exports
type SyncedResource = typeof syncedResources.$inferSelect;
