// ============================================
// FILE: app/routes/_app.screenshots.tsx
// ============================================
import { useState } from "react";
import {
  Title,
  Stack,
  Image,
  Text,
  Group,
  Badge,
  Modal,
  Grid,
  Select,
  ActionIcon,
  Tooltip,
  Box,
  Paper,
  UnstyledButton,
} from "@mantine/core";
import { IconTrash, IconEye, IconBlur } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/session.server";
import { screenshots } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSignedScreenshotUrl } from "~/lib/storage.server";
import { format } from "date-fns";
import { LoaderFunctionArgs, useLoaderData } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");

  const userScreenshots = await db
    .select({
      id: screenshots.id,
      timestamp: screenshots.timestamp,
      windowTitle: screenshots.windowTitle,
      applicationName: screenshots.applicationName,
      isBlurred: screenshots.isBlurred,
      r2KeyOriginal: screenshots.r2KeyOriginal,
      r2KeyBlurred: screenshots.r2KeyBlurred,
    })
    .from(screenshots)
    .where(
      and(
        eq(screenshots.userId, userId),
        eq(screenshots.isDeleted, false)
      )
    )
    .orderBy(desc(screenshots.timestamp))
    .limit(50);

  const screenshotsWithUrls = await Promise.all(
    userScreenshots.map(async (screenshot) => {
      const url = await getSignedScreenshotUrl(
        screenshot.isBlurred ? screenshot.r2KeyBlurred! : screenshot.r2KeyOriginal,
        screenshot.isBlurred ? "blurred" : "original"
      );

      return { ...screenshot, url };
    })
  );

  return { screenshots: screenshotsWithUrls };
}

export default function Screenshots() {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const loaderData = useLoaderData<typeof loader>();

  const openPreview = (screenshot: any) => {
    setSelectedScreenshot(screenshot);
    open();
  };

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
          Screenshots
        </Title>
        <Text c="#787774" size="sm">
          View and manage captured screenshots from Cloudflare R2
        </Text>
      </Box>

      <Group justify="space-between">
        <Select
          placeholder="Select date"
          defaultValue={format(new Date(), "yyyy-MM-dd")}
          data={[
            { value: format(new Date(), "yyyy-MM-dd"), label: "Today" },
          ]}
          styles={{
            input: {
              border: '1px solid #E9E9E7',
              backgroundColor: '#ffffff',
            }
          }}
        />
        <Text size="sm" c="#787774">
          {loaderData.screenshots.length} screenshots
        </Text>
      </Group>

      <Grid>
        {loaderData.screenshots.map((screenshot) => (
          <Grid.Col key={screenshot.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
            <Paper
              radius="md"
              style={{
                border: '1px solid #E9E9E7',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
              className="stat-card"
            >
              <UnstyledButton
                onClick={() => openPreview(screenshot)}
                style={{ display: 'block', width: '100%' }}
              >
                <Image
                  src={screenshot.url}
                  height={160}
                  alt="Screenshot"
                  fit="cover"
                  style={{ backgroundColor: '#FBFBFA' }}
                />
              </UnstyledButton>

              <Stack gap="xs" p="sm">
                <Group justify="space-between">
                  <Text size="xs" c="#787774" fw={500}>
                    {format(new Date(screenshot.timestamp), "HH:mm:ss")}
                  </Text>
                  {screenshot.isBlurred && (
                    <Badge 
                      size="xs" 
                      color="gray" 
                      variant="light"
                      leftSection={<IconBlur size={12} />}
                    >
                      Blurred
                    </Badge>
                  )}
                </Group>

                <Text size="sm" lineClamp={1} fw={500} c="#37352F">
                  {screenshot.applicationName}
                </Text>

                <Text size="xs" c="#787774" lineClamp={2}>
                  {screenshot.windowTitle}
                </Text>

                <Group gap="xs" justify="flex-end" mt="xs">
                  <Tooltip label="View">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => openPreview(screenshot)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon variant="subtle" color="red">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>
        ))}
      </Grid>

      <Modal
        opened={opened}
        onClose={close}
        size="xl"
        title={selectedScreenshot?.applicationName}
        styles={{
          title: {
            fontSize: '18px',
            fontWeight: 600,
            color: '#37352F',
          },
        }}
      >
        {selectedScreenshot && (
          <Stack>
            <Image 
              src={selectedScreenshot.url} 
              alt="Screenshot preview"
              radius="md"
            />
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500} c="#37352F">
                  {format(new Date(selectedScreenshot.timestamp), "PPpp")}
                </Text>
                <Text size="xs" c="#787774" mt={4}>
                  {selectedScreenshot.windowTitle}
                </Text>
              </div>
              {selectedScreenshot.isBlurred && (
                <Badge color="gray" variant="light">Blurred</Badge>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}