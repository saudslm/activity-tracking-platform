// ============================================
// FILE: worker/jobs/clickup-sync.ts
// ============================================
import { Job } from "bullmq";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../app/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

interface ClickUpSyncJobData {
  workspaceId: string;
  organizationId: string;
}

export async function syncClickUpWorkspace(job: Job<ClickUpSyncJobData>) {
  const { workspaceId, organizationId } = job.data;

  try {
    const [workspace] = await db
      .select()
      .from(schema.clickupWorkspaces)
      .where(eq(schema.clickupWorkspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const response = await fetch(
      `https://api.clickup.com/api/v2/team/${workspace.workspaceId}/space`,
      {
        headers: {
          Authorization: workspace.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch ClickUp spaces");
    }

    const { spaces } = await response.json();

    for (const space of spaces) {
      const listsResponse = await fetch(
        `https://api.clickup.com/api/v2/space/${space.id}/list`,
        {
          headers: {
            Authorization: workspace.accessToken,
          },
        }
      );

      if (listsResponse.ok) {
        const { lists } = await listsResponse.json();

        for (const list of lists) {
          const [existingProject] = await db
            .select()
            .from(schema.clickupProjects)
            .where(eq(schema.clickupProjects.projectId, list.id))
            .limit(1);

          if (!existingProject) {
            await db.insert(schema.clickupProjects).values({
              workspaceId: workspace.id,
              projectId: list.id,
              name: list.name,
              status: list.status,
              lastSyncedAt: new Date(),
            });
          }
        }
      }
    }

    await db
      .update(schema.clickupWorkspaces)
      .set({ lastSyncedAt: new Date() })
      .where(eq(schema.clickupWorkspaces.id, workspaceId));

    console.log(`✅ ClickUp workspace ${workspaceId} synced`);
  } catch (error) {
    console.error(`❌ Failed to sync ClickUp workspace ${workspaceId}:`, error);
    throw error;
  }
}