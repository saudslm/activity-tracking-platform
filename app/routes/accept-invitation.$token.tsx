// ============================================
// FILE: app/routes/accept-invitation.$token.tsx
// ============================================
import { useState } from "react";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect, useLoaderData, useFetcher } from "react-router";
import { db } from "~/lib/db.server";
import { invitations, users, organizations } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { IconCheck, IconX } from "@tabler/icons-react";
import bcrypt from "bcryptjs";

export async function loader({ params }: LoaderFunctionArgs) {
  const token = params.token;

  if (!token) {
    return { error: "Invalid invitation link" };
  }

  const [invitation] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      name: invitations.name,
      role: invitations.role,
      organizationId: invitations.organizationId,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      organizationName: organizations.name,
    })
    .from(invitations)
    .leftJoin(organizations, eq(invitations.organizationId, organizations.id))
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.status !== "pending") {
    return { error: "This invitation has already been used" };
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    // Mark as expired
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invitation.id));

    return { error: "This invitation has expired" };
  }

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, invitation.email),
        eq(users.organizationId, invitation.organizationId)
      )
    )
    .limit(1);

  if (existingUser) {
    return { error: "An account with this email already exists in this organization" };
  }

  return { 
    invitation: {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      organizationName: invitation.organizationName,
    }
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const token = params.token!;
  const formData = await request.formData();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validate password
  if (!password || password.length < 8) {
    return { 
      success: false, 
      error: "Password must be at least 8 characters long" 
    };
  }

  if (password !== confirmPassword) {
    return { 
      success: false, 
      error: "Passwords do not match" 
    };
  }

  // Get invitation
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation || invitation.status !== "pending") {
    return { 
      success: false, 
      error: "Invalid or expired invitation" 
    };
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invitation.id));

    return { 
      success: false, 
      error: "This invitation has expired" 
    };
  }

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, invitation.email),
        eq(users.organizationId, invitation.organizationId)
      )
    )
    .limit(1);

  if (existingUser) {
    return { 
      success: false, 
      error: "An account with this email already exists" 
    };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  await db.insert(users).values({
    email: invitation.email,
    name: invitation.name,
    passwordHash: hashedPassword,
    role: invitation.role,
    organizationId: invitation.organizationId,
    isActive: true,
  });

  // Mark invitation as accepted
  await db
    .update(invitations)
    .set({ 
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  // Redirect to login
  return redirect("/login?message=Account created successfully. Please log in.");
}

export default function AcceptInvitation() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSubmitting = fetcher.state === "submitting";
  const error = loaderData.error || fetcher.data?.error;

  if (loaderData.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <IconX size={24} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-center text-foreground">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {loaderData.error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              onClick={() => window.location.href = "/login"}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = loaderData.invitation!;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <IconCheck size={24} className="text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-foreground">
            You've been invited!
          </CardTitle>
          <CardDescription className="text-center">
            Join <span className="font-semibold">{invitation.organizationName}</span> as a{" "}
            <span className="font-semibold capitalize">{invitation.role}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <fetcher.Form method="post" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={invitation.name}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
            >
              {isSubmitting ? "Creating account..." : "Accept invitation & Create Account"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By accepting this invitation, you agree to join {invitation.organizationName}
            </p>
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}