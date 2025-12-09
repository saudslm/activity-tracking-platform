// ============================================
// FILE: app/routes/_app.settings.profile.tsx
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

export default function ProfileSettings() {
  return (
    <Paper p="xl" radius="md" style={{ border: '1px solid #E9E9E7' }}>
      <Stack gap="lg">
        <TextInput
          label="Full Name"
          placeholder="John Doe"
          styles={{
            label: { color: '#37352F', fontWeight: 600, marginBottom: '8px' },
          }}
        />
        <TextInput
          label="Email"
          placeholder="you@company.com"
          type="email"
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
