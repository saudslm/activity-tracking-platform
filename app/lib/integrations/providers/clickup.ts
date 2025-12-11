// ============================================
// FILE: app/lib/integrations/providers/clickup.ts
// ============================================
import {
  IntegrationProvider,
  OAuthTokens,
  Workspace,
  Project,
  Task,
  TimeEntryInput,
  TimeEntryResult,
  IntegrationUser,
  AuthenticationError,
  RateLimitError,
  IntegrationError,
} from '../base-provider';

export class ClickUpProvider implements IntegrationProvider {
  name = 'clickup';
  displayName = 'ClickUp';
  icon = 'clickup-icon'; // You can use IconClick from tabler-icons

  private readonly clientId = process.env.CLICKUP_CLIENT_ID!;
  private readonly clientSecret = process.env.CLICKUP_CLIENT_SECRET!;
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://app.clickup.com/api?${params}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://api.clickup.com/api/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new AuthenticationError('clickup', 'Failed to exchange code for token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      tokenType: 'Bearer',
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // ClickUp doesn't use refresh tokens - access tokens don't expire
    throw new IntegrationError('ClickUp does not support refresh tokens', 'clickup');
  }

  async fetchWorkspaces(accessToken: string): Promise<Workspace[]> {
    const teams = await this.makeRequest<{ teams: any[] }>(
      accessToken,
      '/team'
    );

    return teams.teams.map((team) => ({
      id: team.id,
      name: team.name,
      avatar: team.avatar,
      metadata: { color: team.color, members: team.members },
    }));
  }

  async fetchProjects(accessToken: string, workspaceId: string): Promise<Project[]> {
    const spaces = await this.makeRequest<{ spaces: any[] }>(
      accessToken,
      `/team/${workspaceId}/space?archived=false`
    );

    return spaces.spaces.map((space) => ({
      id: space.id,
      name: space.name,
      workspaceId,
      color: space.color,
      metadata: { private: space.private, statuses: space.statuses },
    }));
  }

  async fetchTasks(accessToken: string, projectId: string): Promise<Task[]> {
    const lists = await this.makeRequest<{ lists: any[] }>(
      accessToken,
      `/space/${projectId}/list`
    );

    const allTasks: Task[] = [];

    for (const list of lists.lists) {
      const tasks = await this.makeRequest<{ tasks: any[] }>(
        accessToken,
        `/list/${list.id}/task`
      );

      allTasks.push(
        ...tasks.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          projectId,
          description: task.description,
          status: task.status?.status,
          assignees: task.assignees?.map((a: any) => a.id) || [],
          dueDate: task.due_date ? new Date(parseInt(task.due_date)) : undefined,
          metadata: {
            listId: list.id,
            listName: list.name,
            priority: task.priority,
            tags: task.tags,
          },
        }))
      );
    }

    return allTasks;
  }

  async createTimeEntry(accessToken: string, entry: TimeEntryInput): Promise<TimeEntryResult> {
    const duration = entry.duration || (entry.endTime 
      ? entry.endTime.getTime() - entry.startTime.getTime() 
      : 0);

    const data = await this.makeRequest<{ data: any }>(
      accessToken,
      `/task/${entry.taskId}/time`,
      {
        method: 'POST',
        body: JSON.stringify({
          start: entry.startTime.getTime(),
          end: entry.endTime?.getTime(),
          duration: Math.floor(duration),
          description: entry.description,
          billable: entry.billable,
        }),
      }
    );

    return {
      id: data.data.id,
      taskId: entry.taskId,
      startTime: new Date(parseInt(data.data.start)),
      endTime: data.data.end ? new Date(parseInt(data.data.end)) : undefined,
      duration: parseInt(data.data.duration),
      metadata: data.data,
    };
  }

  async updateTimeEntry(
    accessToken: string,
    entryId: string,
    entry: Partial<TimeEntryInput>
  ): Promise<TimeEntryResult> {
    const updateData: any = {};
    
    if (entry.startTime) updateData.start = entry.startTime.getTime();
    if (entry.endTime) updateData.end = entry.endTime.getTime();
    if (entry.duration) updateData.duration = Math.floor(entry.duration);
    if (entry.description !== undefined) updateData.description = entry.description;
    if (entry.billable !== undefined) updateData.billable = entry.billable;

    const data = await this.makeRequest<{ data: any }>(
      accessToken,
      `/team/time/${entryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }
    );

    return {
      id: data.data.id,
      taskId: data.data.task.id,
      startTime: new Date(parseInt(data.data.start)),
      endTime: data.data.end ? new Date(parseInt(data.data.end)) : undefined,
      duration: parseInt(data.data.duration),
      metadata: data.data,
    };
  }

  async deleteTimeEntry(accessToken: string, entryId: string): Promise<void> {
    await this.makeRequest(accessToken, `/team/time/${entryId}`, {
      method: 'DELETE',
    });
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getCurrentUser(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentUser(accessToken: string): Promise<IntegrationUser> {
    const data = await this.makeRequest<{ user: any }>(accessToken, '/user');

    return {
      id: data.user.id.toString(),
      name: data.user.username,
      email: data.user.email,
      avatar: data.user.profilePicture,
    };
  }

  // Helper method for API requests
  private async makeRequest<T>(
    accessToken: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new AuthenticationError('clickup', 'Invalid or expired token');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('clickup', retryAfter ? parseInt(retryAfter) : undefined);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ err: 'Unknown error' }));
      throw new IntegrationError(
        error.err || `API error: ${response.status}`,
        'clickup',
        error.ECODE,
        response.status
      );
    }

    return response.json();
  }
}