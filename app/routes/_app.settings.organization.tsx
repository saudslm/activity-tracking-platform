// ============================================
// FILE: app/routes/_app.settings.organization.tsx
// ============================================
import {
  Stack,
  TextInput,
  Button,
  Paper,
} from "@mantine/core";
import { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function OrganizationSettings() {
  return (
    <Paper p="xl" radius="md" style={{ border: '1px solid #E9E9E7' }}>
      <Stack gap="lg">
        <TextInput
          label="Organization Name"
          placeholder="Acme Inc"
          styles={{
            label: { color: '#37352F', fontWeight: 600, marginBottom: '8px' },
          }}
        />
        <Button style={{ backgroundColor: '#2383E2', fontWeight: 500 }}>
          Save changes
        </Button>
      </Stack>
    </Paper>
  );
}