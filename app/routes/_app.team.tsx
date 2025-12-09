// ============================================
// FILE: app/routes/_app.team.tsx
// ============================================
import {
  Title,
  Stack,
  Table,
  Avatar,
  Group,
  Text,
  Badge,
  Button,
  Modal,
  TextInput,
  Select,
  Box,
  Paper,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconDots } from "@tabler/icons-react";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/session.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import { LoaderFunctionArgs, useLoaderData } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const teamMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(eq(users.organizationId, currentUser.organizationId))
    .orderBy(users.name);

  return { teamMembers, currentUserRole: currentUser.role };
}

export default function Team() {
  const [opened, { open, close }] = useDisclosure(false);
  const loaderData = useLoaderData<typeof loader>();

  const rows = loaderData.teamMembers.map((member) => (
    <Table.Tr 
      key={member.id}
      style={{ transition: 'background-color 0.15s ease' }}
      className="stat-card"
    >
      <Table.Td>
        <Group gap="sm">
          <Avatar color="dark" radius="xl" size="md">
            {member.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text size="sm" fw={500} c="#37352F">
              {member.name}
            </Text>
            <Text size="xs" c="#787774">
              {member.email}
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge
          color={
            member.role === "admin" ? "dark" : 
            member.role === "manager" ? "blue" : "gray"
          }
          variant="light"
          size="sm"
        >
          {member.role}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge 
          color={member.isActive ? "green" : "gray"}
          variant="dot"
          size="sm"
        >
          {member.isActive ? "Active" : "Inactive"}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="#787774">
          {member.lastSeenAt
            ? new Date(member.lastSeenAt).toLocaleDateString()
            : "Never"}
        </Text>
      </Table.Td>
      <Table.Td>
        <UnstyledButton>
          <IconDots size={18} color="#787774" />
        </UnstyledButton>
      </Table.Td>
    </Table.Tr>
  ));

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
            Team
          </Title>
          <Text c="#787774" size="sm">
            Manage team members and permissions
          </Text>
        </Box>
        {loaderData.currentUserRole === "admin" && (
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={open}
            style={{ backgroundColor: '#2383E2', fontWeight: 500 }}
          >
            Invite member
          </Button>
        )}
      </Group>

      <Paper
        radius="md"
        style={{
          border: '1px solid #E9E9E7',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ color: '#787774', fontWeight: 600 }}>Member</Table.Th>
              <Table.Th style={{ color: '#787774', fontWeight: 600 }}>Role</Table.Th>
              <Table.Th style={{ color: '#787774', fontWeight: 600 }}>Status</Table.Th>
              <Table.Th style={{ color: '#787774', fontWeight: 600 }}>Last Seen</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={close} title="Invite team member">
        <Stack>
          <TextInput label="Email" placeholder="colleague@company.com" required />
          <TextInput label="Name" placeholder="John Doe" required />
          <Select
            label="Role"
            placeholder="Select role"
            data={[
              { value: "employee", label: "Employee" },
              { value: "manager", label: "Manager" },
              { value: "admin", label: "Admin" },
            ]}
            required
          />
          <Button fullWidth style={{ backgroundColor: '#2383E2' }}>
            Send invitation
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}