// ============================================
// FILE: app/lib/integrations/base-provider.ts
// ============================================
// Base interface that all integration providers must implement

export interface IntegrationProvider {
  // Provider identification
  name: string;
  displayName: string;
  icon: string; // Icon component or URL
  
  // OAuth configuration
  getAuthUrl(state: string, redirectUri: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  
  // Resource fetching
  fetchWorkspaces(accessToken: string): Promise<Workspace[]>;
  fetchProjects(accessToken: string, workspaceId: string): Promise<Project[]>;
  fetchCollections(accessToken: string, projectId: string): Promise<Collection[]>;
  fetchTasks(accessToken: string, collectionId: string): Promise<Task[]>;
  
  // Time tracking
  createTimeEntry(accessToken: string, entry: TimeEntryInput): Promise<TimeEntryResult>;
  updateTimeEntry(accessToken: string, entryId: string, entry: Partial<TimeEntryInput>): Promise<TimeEntryResult>;
  deleteTimeEntry(accessToken: string, entryId: string): Promise<void>;
  
  // Validation
  validateToken(accessToken: string): Promise<boolean>;
  getCurrentUser(accessToken: string): Promise<IntegrationUser>;
  
  // Hierarchy
  getHierarchy(): ResourceHierarchy;
}

// Resource hierarchy definition
export interface ResourceHierarchy {
  supports: {
    containers: boolean; // Workspaces/Teams
    projects: boolean;
    collections: boolean; // Lists/Sections/Sprints
    subCollections: boolean; // Folders, nested lists
  };
  labels: {
    container: string; // "Workspace", "Team", "Organization"
    project: string; // "Space", "Project", "Repository"
    collection: string; // "List", "Section", "Board"
    task: string; // "Task", "Issue", "Card"
  };
  maxDepth: number; // Maximum nesting level
}

// Common types
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface Workspace {
  id: string;
  name: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  color?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface Collection {
  id: string;
  name: string;
  projectId: string;
  color?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  status?: string;
  assignees?: string[];
  dueDate?: Date;
  metadata?: Record<string, any>;
}

export interface TimeEntryInput {
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  description?: string;
  billable?: boolean;
}

export interface TimeEntryResult {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  metadata?: Record<string, any>;
}

export interface IntegrationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Error types
export class IntegrationError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(provider: string, message: string = 'Authentication failed') {
    super(message, provider, 'AUTH_FAILED', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends IntegrationError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`, provider, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

export class ResourceNotFoundError extends IntegrationError {
  constructor(provider: string, resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, provider, 'NOT_FOUND', 404);
    this.name = 'ResourceNotFoundError';
  }
}
