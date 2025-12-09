// ============================================
// FILE: app/routes/_app.reports.tsx
// ============================================
import {
  Title,
  Stack,
  Box,
  Text,
  Group,
  Paper,
  Button,
} from "@mantine/core";
import { IconDownload, IconCalendar } from "@tabler/icons-react";
import { LoaderFunctionArgs, useLoaderData } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return { reports: [] };
}

export default function Reports() {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Box>
          <Title 
            order={1} 
            style={{ 
              fontSize: '40px', 
              fontWeight: 700,
              color: '#37352F',
              marginBottom: '4px'
            }}
          >
            Reports
          </Title>
          <Text c="#787774" size="sm">
            Generate and download productivity reports
          </Text>
        </Box>
        <Button 
          leftSection={<IconDownload size={16} />}
          variant="light"
          color="dark"
        >
          Export
        </Button>
      </Group>

      <Paper
        p="xl"
        radius="md"
        style={{
          border: '1px solid #E9E9E7',
          backgroundColor: '#ffffff',
          textAlign: 'center',
          padding: '60px 20px',
        }}
      >
        <IconCalendar size={48} color="#787774" style={{ marginBottom: '16px' }} />
        <Text size="lg" fw={600} c="#37352F" mb="xs">
          No reports yet
        </Text>
        <Text size="sm" c="#787774" mb="xl">
          Reports will appear here once you have activity data
        </Text>
        <Button style={{ backgroundColor: '#2383E2', fontWeight: 500 }}>
          Generate first report
        </Button>
      </Paper>
    </Stack>
  );
}
