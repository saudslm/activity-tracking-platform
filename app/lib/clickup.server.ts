// ============================================
// FILE: app/lib/clickup.server.ts
// ============================================
interface ClickUpConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const config: ClickUpConfig = {
  clientId: process.env.CLICKUP_CLIENT_ID!,
  clientSecret: process.env.CLICKUP_CLIENT_SECRET!,
  redirectUri: process.env.CLICKUP_REDIRECT_URI!,
};

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  });

  return `https://app.clickup.com/api?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
}> {
  const response = await fetch("https://api.clickup.com/api/v2/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  return response.json();
}

export async function getWorkspaces(accessToken: string) {
  const response = await fetch("https://api.clickup.com/api/v2/team", {
    headers: {
      Authorization: accessToken,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch workspaces");
  }

  return response.json();
}

export async function createTimeEntry(
  accessToken: string,
  taskId: string,
  data: {
    duration: number;
    start: number;
    description?: string;
  }
) {
  const response = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}/time`,
    {
      method: "POST",
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create time entry");
  }

  return response.json();
}