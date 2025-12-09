// ============================================
// FILE: app/routes/_app.settings.clickup.tsx
// ============================================
import {
  Stack,
  Button,
  Paper,
  Text,
  Group,
  Badge,
} from "@mantine/core";
import { IconClick } from "@tabler/icons-react"
import { LoaderFunctionArgs, useLoaderData } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return { connected: false };
}

export default function ClickUpSettings() {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <Paper p="xl" radius="md" style={{ border: '1px solid #E9E9E7' }}>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Group gap="sm" mb="xs">
              <IconClick size={24} />
              <Text size="lg" fw={600} c="#37352F">
                ClickUp Integration
              </Text>
            </Group>
            <Text size="sm" c="#787774">
              Connect your ClickUp workspace to automatically track time
            </Text>
          </div>
          {loaderData.connected ? (
            <Badge color="green" variant="light">Connected</Badge>
          ) : (
            <Badge color="gray" variant="light">Not connected</Badge>
          )}
        </Group>

        {!loaderData.connected && (
          <Button 
            leftSection={<IconClick size={16} />}
            style={{ backgroundColor: '#2383E2', fontWeight: 500 }}
          >
            Connect ClickUp
          </Button>
        )}
      </Stack>
    </Paper>
  );
}