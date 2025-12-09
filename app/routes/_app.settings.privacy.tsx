// ============================================
// FILE: app/routes/_app.settings.privacy.tsx
// ============================================
import {
  Stack,
  Select,
  Switch,
  Button,
  Paper,
  Text,
  TextInput,
} from "@mantine/core";
import { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function PrivacySettings() {
  return (
    <Paper p="xl" radius="md" style={{ border: '1px solid #E9E9E7' }}>
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="#37352F" mb="xs">
            Screenshot Blur Mode
          </Text>
          <Select
            placeholder="Select blur mode"
            data={[
              { value: "always", label: "Always blur screenshots" },
              { value: "optional", label: "Let employees choose" },
              { value: "never", label: "Never blur" },
            ]}
            styles={{
              label: { color: '#37352F', fontWeight: 600, marginBottom: '8px' },
            }}
          />
        </div>

        <Switch
          label="Allow employees to delete screenshots"
          description="Within the grace period set below"
        />

        <TextInput
          label="Delete Grace Period (minutes)"
          placeholder="5"
          type="number"
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