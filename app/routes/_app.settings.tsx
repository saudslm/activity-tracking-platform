// ============================================
// FILE: app/routes/_app.settings.tsx
// ============================================
import {
  Title,
  Stack,
  Box,
  Text,
  Tabs,
} from "@mantine/core";
import { LoaderFunctionArgs, Outlet, useLoaderData, useLocation, useNavigate } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const loaderData = useLoaderData<typeof loader>();

  return (
    <Stack gap="xl">
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
          Settings
        </Title>
        <Text c="#787774" size="sm">
          Manage your account and organization preferences
        </Text>
      </Box>

      <Tabs 
        value={location.pathname}
        onChange={(value) => navigate(value!)}
        styles={{
          list: {
            borderBottom: '1px solid #E9E9E7',
          },
          tab: {
            color: '#787774',
            fontWeight: 500,
            padding: '12px 16px',
            '&[data-active]': {
              color: '#37352F',
              borderColor: '#37352F',
            },
            '&:hover': {
              backgroundColor: 'transparent',
              borderColor: '#787774',
            },
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="/settings/profile">Profile</Tabs.Tab>
          <Tabs.Tab value="/settings/organization">Organization</Tabs.Tab>
          <Tabs.Tab value="/settings/privacy">Privacy</Tabs.Tab>
          <Tabs.Tab value="/settings/clickup">ClickUp</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Outlet />
    </Stack>
  );
}