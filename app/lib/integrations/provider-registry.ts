// ============================================
// FILE: app/lib/integrations/provider-registry.ts
// ============================================
import { IntegrationProvider } from './base-provider';
import { ClickUpProvider } from './providers/clickup';
// Import other providers as you add them
// import { AsanaProvider } from './providers/asana';
// import { JiraProvider } from './providers/jira';

export type ProviderType = 'clickup' | 'asana' | 'jira' | 'linear' | 'github' | 'gitlab';

export interface ProviderMetadata {
  name: ProviderType;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  features: {
    timeTracking: boolean;
    tasks: boolean;
    projects: boolean;
    workspaces: boolean;
  };
  requiredEnvVars: string[];
  isEnabled: boolean;
}

class ProviderRegistry {
  private providers: Map<ProviderType, IntegrationProvider> = new Map();
  private metadata: Map<ProviderType, ProviderMetadata> = new Map();

  constructor() {
    this.registerProviders();
  }

  private registerProviders() {
    // Register ClickUp
    const clickupEnabled = !!(process.env.CLICKUP_CLIENT_ID && process.env.CLICKUP_CLIENT_SECRET);
    this.providers.set('clickup', new ClickUpProvider());
    this.metadata.set('clickup', {
      name: 'clickup',
      displayName: 'ClickUp',
      description: 'Connect with ClickUp to sync tasks and track time',
      icon: 'clickup',
      color: '#7B68EE',
      features: {
        timeTracking: true,
        tasks: true,
        projects: true,
        workspaces: true,
      },
      requiredEnvVars: ['CLICKUP_CLIENT_ID', 'CLICKUP_CLIENT_SECRET'],
      isEnabled: clickupEnabled,
    });

    // Register Asana (placeholder)
    // const asanaEnabled = !!(process.env.ASANA_CLIENT_ID && process.env.ASANA_CLIENT_SECRET);
    // this.providers.set('asana', new AsanaProvider());
    this.metadata.set('asana', {
      name: 'asana',
      displayName: 'Asana',
      description: 'Connect with Asana to sync tasks and projects',
      icon: 'asana',
      color: '#F06A6A',
      features: {
        timeTracking: false,
        tasks: true,
        projects: true,
        workspaces: true,
      },
      requiredEnvVars: ['ASANA_CLIENT_ID', 'ASANA_CLIENT_SECRET'],
      isEnabled: false, // Not implemented yet
    });

    // Register Jira (placeholder)
    this.metadata.set('jira', {
      name: 'jira',
      displayName: 'Jira',
      description: 'Connect with Jira to sync issues and projects',
      icon: 'jira',
      color: '#0052CC',
      features: {
        timeTracking: true,
        tasks: true,
        projects: true,
        workspaces: true,
      },
      requiredEnvVars: ['JIRA_CLIENT_ID', 'JIRA_CLIENT_SECRET'],
      isEnabled: false, // Not implemented yet
    });

    // Register Linear (placeholder)
    this.metadata.set('linear', {
      name: 'linear',
      displayName: 'Linear',
      description: 'Connect with Linear to sync issues and projects',
      icon: 'linear',
      color: '#5E6AD2',
      features: {
        timeTracking: false,
        tasks: true,
        projects: true,
        workspaces: true,
      },
      requiredEnvVars: ['LINEAR_CLIENT_ID', 'LINEAR_CLIENT_SECRET'],
      isEnabled: false, // Not implemented yet
    });
  }

  getProvider(providerType: ProviderType): IntegrationProvider | undefined {
    return this.providers.get(providerType);
  }

  getMetadata(providerType: ProviderType): ProviderMetadata | undefined {
    return this.metadata.get(providerType);
  }

  getAllMetadata(): ProviderMetadata[] {
    return Array.from(this.metadata.values());
  }

  getEnabledProviders(): ProviderMetadata[] {
    return Array.from(this.metadata.values()).filter((meta) => meta.isEnabled);
  }

  isProviderEnabled(providerType: ProviderType): boolean {
    return this.metadata.get(providerType)?.isEnabled ?? false;
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();

// Helper function to get provider
export function getProvider(providerType: ProviderType): IntegrationProvider {
  const provider = providerRegistry.getProvider(providerType);
  if (!provider) {
    throw new Error(`Provider not found: ${providerType}`);
  }
  return provider;
}
