// ============================================
// FILE: app/lib/integrations/integration-service.server.ts
// ============================================
import { db } from '~/lib/db.server';
import { integrations, integrationConfigs, syncedResources, timeEntryMappings } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { getProvider, ProviderType } from './provider-registry';
import { OAuthTokens } from './base-provider';

export class IntegrationService {
  // Create or update integration
  async connectIntegration(params: {
    organizationId: string;
    userId?: string;
    provider: ProviderType;
    tokens: OAuthTokens;
    providerAccountId?: string;
    metadata?: Record<string, any>;
  }) {
    // Check if integration already exists
    const [existing] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, params.organizationId),
          eq(integrations.provider, params.provider),
          params.userId ? eq(integrations.userId, params.userId) : undefined
        )
      )
      .limit(1);

    if (existing) {
      // Update existing integration
      const [updated] = await db
        .update(integrations)
        .set({
          accessToken: params.tokens.accessToken,
          refreshToken: params.tokens.refreshToken,
          tokenType: params.tokens.tokenType,
          expiresAt: params.tokens.expiresAt,
          scope: params.tokens.scope,
          providerAccountId: params.providerAccountId,
          metadata: params.metadata,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id))
        .returning();

      return updated;
    }

    // Create new integration
    const [created] = await db
      .insert(integrations)
      .values({
        organizationId: params.organizationId,
        userId: params.userId,
        provider: params.provider,
        accessToken: params.tokens.accessToken,
        refreshToken: params.tokens.refreshToken,
        tokenType: params.tokens.tokenType,
        expiresAt: params.tokens.expiresAt,
        scope: params.tokens.scope,
        providerAccountId: params.providerAccountId,
        metadata: params.metadata,
        isActive: true,
      })
      .returning();

    return created;
  }

  // Get integration
  async getIntegration(params: {
    organizationId: string;
    provider: ProviderType;
    userId?: string;
  }) {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, params.organizationId),
          eq(integrations.provider, params.provider),
          eq(integrations.isActive, true),
          params.userId ? eq(integrations.userId, params.userId) : undefined
        )
      )
      .limit(1);

    return integration;
  }

  // Get all integrations for organization
  async getOrganizationIntegrations(organizationId: string) {
    return db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.isActive, true)
        )
      );
  }

  // Disconnect integration
  async disconnectIntegration(integrationId: string) {
    await db
      .update(integrations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(integrations.id, integrationId));
  }

  // Sync workspaces/projects/tasks
  async syncResources(integrationId: string) {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, integrationId))
      .limit(1);

    if (!integration) {
      throw new Error('Integration not found');
    }

    const provider = getProvider(integration.provider as ProviderType);

    // Fetch and store workspaces
    const workspaces = await provider.fetchWorkspaces(integration.accessToken);
    
    for (const workspace of workspaces) {
      await db
        .insert(syncedResources)
        .values({
          integrationId: integration.id,
          resourceType: 'workspace',
          externalId: workspace.id,
          name: workspace.name,
          data: workspace.metadata,
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        })
        .onConflictDoUpdate({
          target: [syncedResources.integrationId, syncedResources.resourceType, syncedResources.externalId],
          set: {
            name: workspace.name,
            data: workspace.metadata,
            lastSyncedAt: new Date(),
            syncStatus: 'synced',
            updatedAt: new Date(),
          },
        });
    }

    // Update last synced timestamp
    await db
      .update(integrations)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(integrations.id, integrationId));

    return { workspaces: workspaces.length };
  }

  // Get synced resources
  async getSyncedResources(integrationId: string, resourceType?: 'task' | 'project' | 'workspace' | 'user' | 'custom') {
    return db
      .select()
      .from(syncedResources)
      .where(
        and(
          eq(syncedResources.integrationId, integrationId),
          resourceType ? eq(syncedResources.resourceType, resourceType) : undefined
        )
      );
  }

  // Set configuration
  async setConfig(integrationId: string, key: string, value: any) {
    await db
      .insert(integrationConfigs)
      .values({
        integrationId,
        key,
        value,
      })
      .onConflictDoUpdate({
        target: [integrationConfigs.integrationId, integrationConfigs.key],
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  }

  // Get configuration
  async getConfig(integrationId: string, key: string) {
    const [config] = await db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.integrationId, integrationId),
          eq(integrationConfigs.key, key)
        )
      )
      .limit(1);

    return config?.value;
  }

  // Get all configurations
  async getAllConfigs(integrationId: string) {
    const configs = await db
      .select()
      .from(integrationConfigs)
      .where(eq(integrationConfigs.integrationId, integrationId));

    return Object.fromEntries(configs.map((c) => [c.key, c.value]));
  }

  // Link time entry to external task
  async linkTimeEntry(params: {
    timeEntryId: string;
    integrationId: string;
    externalTaskId: string;
    externalTaskName?: string;
  }) {
    const [mapping] = await db
      .insert(timeEntryMappings)
      .values(params)
      .returning();

    return mapping;
  }

  // Sync time entry to external provider
  async syncTimeEntry(timeEntryId: string) {
    // Get time entry with integration mapping
    const [mapping] = await db
      .select()
      .from(timeEntryMappings)
      .where(eq(timeEntryMappings.timeEntryId, timeEntryId))
      .limit(1);

    if (!mapping) {
      throw new Error('Time entry not linked to any integration');
    }

    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, mapping.integrationId))
      .limit(1);

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Get time entry details
    // const timeEntry = await db.query.timeEntries.findFirst({
    //   where: eq(timeEntries.id, timeEntryId),
    // });

    const provider = getProvider(integration.provider as ProviderType);

    // TODO: Create or update time entry in external provider
    // const result = await provider.createTimeEntry(integration.accessToken, {...});

    // Update mapping status
    await db
      .update(timeEntryMappings)
      .set({
        syncStatus: 'synced',
        syncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timeEntryMappings.id, mapping.id));
  }
}

export const integrationService = new IntegrationService();