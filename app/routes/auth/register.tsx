// ============================================
// FILE: app/routes/auth/register.tsx
// ============================================
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Stack,
  Anchor,
  Text,
  Box,
} from "@mantine/core";
import { ActionFunctionArgs, Form, redirect, useActionData, useNavigate } from "react-router";
import { hashPassword } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { users, organizations } from "~/db/schema";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const organizationName = formData.get("organizationName") as string;

  if (!email || !password || !name || !organizationName) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    const [org] = await db
      .insert(organizations)
      .values({
        name: organizationName,
      })
      .returning();

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      email,
      passwordHash,
      name,
      organizationId: org.id,
      role: "admin",
      canBlurScreenshots: true,
    });

    return redirect("/login");
  } catch (error: any) {
    if (error?.code === "23505") {
      return { error: "Email already exists" };
    }
    return { error: "Failed to create account" };
  }
}

export default function Register() {
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();

  return (
    <Box style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center',
      backgroundColor: '#FBFBFA' 
    }}>
      <Container size={420}>
        <Stack gap="xl">
          <div style={{ textAlign: 'center' }}>
            <Title 
              order={1} 
              style={{ 
                fontSize: '32px', 
                fontWeight: 700,
                color: '#37352F',
                marginBottom: '8px'
              }}
            >
              Create your account
            </Title>
            <Text c="#787774" size="sm">
              Already have an account?{" "}
              <Anchor 
                size="sm" 
                component="button" 
                onClick={() => navigate("/login")}
                style={{ color: '#2383E2', fontWeight: 500 }}
              >
                Sign in
              </Anchor>
            </Text>
          </div>

          <Paper 
            p={32} 
            radius="lg"
            style={{
              border: '1px solid #E9E9E7',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Form method="post">
              <Stack gap="lg">
                <TextInput
                  label="Full Name"
                  name="name"
                  placeholder="John Doe"
                  required
                  styles={{
                    label: { 
                      color: '#37352F', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      marginBottom: '8px'
                    },
                  }}
                />

                <TextInput
                  label="Work Email"
                  name="email"
                  placeholder="you@company.com"
                  required
                  type="email"
                  styles={{
                    label: { 
                      color: '#37352F', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      marginBottom: '8px'
                    },
                  }}
                />

                <TextInput
                  label="Organization Name"
                  name="organizationName"
                  placeholder="Acme Inc"
                  required
                  styles={{
                    label: { 
                      color: '#37352F', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      marginBottom: '8px'
                    },
                  }}
                />

                <PasswordInput
                  label="Password"
                  name="password"
                  placeholder="At least 8 characters"
                  required
                  styles={{
                    label: { 
                      color: '#37352F', 
                      fontWeight: 600, 
                      fontSize: '14px',
                      marginBottom: '8px'
                    },
                  }}
                />

                {actionData?.error && (
                  <Text c="red" size="sm" style={{ 
                    padding: '8px 12px',
                    backgroundColor: '#FFF3F3',
                    borderRadius: '6px',
                    border: '1px solid #FFE0E0'
                  }}>
                    {actionData.error}
                  </Text>
                )}

                <Button 
                  type="submit" 
                  fullWidth
                  size="md"
                  style={{
                    backgroundColor: '#2383E2',
                    fontWeight: 600,
                  }}
                >
                  Create account
                </Button>
              </Stack>
            </Form>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
