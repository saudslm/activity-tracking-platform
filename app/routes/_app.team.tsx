// ============================================
// FILE: app/routes/_app.team.tsx (WITH INVITE WORKFLOW)
// ============================================
import { useState } from "react";
import { IconPlus, IconDots, IconMail, IconCheck } from "@tabler/icons-react";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/session.server";
import { users, invitations } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { ActionFunctionArgs, LoaderFunctionArgs, useLoaderData, useFetcher } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Alert, AlertDescription } from "~/components/ui/alert";

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

  // Get pending invitations
  const pendingInvitations = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      createdAt: invitations.createdAt,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, currentUser.organizationId),
        eq(invitations.status, "pending")
      )
    )
    .orderBy(invitations.createdAt);

  return { 
    teamMembers, 
    pendingInvitations,
    currentUserRole: currentUser.role 
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");
  const formData = await request.formData();
  const intent = formData.get("intent");

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Check if user is admin
  if (currentUser.role !== "admin") {
    return { 
      success: false, 
      error: "Only admins can invite team members" 
    };
  }

  if (intent === "invite") {
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;

    // Validate email
    if (!email || !email.includes("@")) {
      return { success: false, error: "Please enter a valid email address" };
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.organizationId, currentUser.organizationId)
        )
      )
      .limit(1);

    if (existingUser) {
      return { success: false, error: "This user is already part of your team" };
    }

    // Check for existing pending invitation
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.organizationId, currentUser.organizationId),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation) {
      return { success: false, error: "An invitation has already been sent to this email" };
    }

    // Create invitation
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    await db.insert(invitations).values({
      email,
      name,
      role: role as "admin" | "manager" | "employee",
      organizationId: currentUser.organizationId,
      invitedBy: userId,
      token: invitationToken,
      expiresAt,
      status: "pending",
    });

    // TODO: Send invitation email
    // await sendInvitationEmail(email, name, invitationToken);

    return { 
      success: true, 
      message: `Invitation sent to ${email}`,
      email 
    };
  }

  if (intent === "resend") {
    const invitationId = formData.get("invitationId") as string;

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Update expiry date
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await db
      .update(invitations)
      .set({ expiresAt: newExpiresAt })
      .where(eq(invitations.id, invitationId));

    // TODO: Resend invitation email
    // await sendInvitationEmail(invitation.email, invitation.name, invitation.token);

    return { 
      success: true, 
      message: `Invitation resent to ${invitation.email}` 
    };
  }

  if (intent === "cancel") {
    const invitationId = formData.get("invitationId") as string;

    await db
      .update(invitations)
      .set({ status: "cancelled" })
      .where(eq(invitations.id, invitationId));

    return { 
      success: true, 
      message: "Invitation cancelled" 
    };
  }

  return { success: false, error: "Invalid action" };
}

export default function Team() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("employee");
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const isSubmitting = fetcher.state === "submitting";
  const showSuccess = fetcher.data?.success;
  const showError = fetcher.data?.error;

  // Close dialog on success
  if (showSuccess && dialogOpen) {
    setTimeout(() => setDialogOpen(false), 1500);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-bold text-muted mb-1">
            Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and permissions
          </p>
        </div>
        {loaderData.currentUserRole === "admin" && (
          <Button onClick={() => setDialogOpen(true)}>
            <IconPlus size={16} className="mr-2" />
            Invite member
          </Button>
        )}
      </div>

      {/* Pending Invitations */}
      {loaderData.pendingInvitations.length > 0 && (
        <Card className="border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <IconMail size={20} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground">
              Pending Invitations ({loaderData.pendingInvitations.length})
            </h3>
          </div>
          <div className="space-y-3">
            {loaderData.pendingInvitations.map((invitation) => (
              <div 
                key={invitation.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconMail size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Invited {new Date(invitation.createdAt).toLocaleDateString()} • 
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {invitation.role}
                  </Badge>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="resend" />
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <Button 
                      type="submit" 
                      variant="ghost" 
                      size="sm"
                      disabled={isSubmitting}
                    >
                      Resend
                    </Button>
                  </fetcher.Form>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="cancel" />
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <Button 
                      type="submit" 
                      variant="ghost" 
                      size="sm"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Team Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Last Seen
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loaderData.teamMembers.map((member) => (
                <tr 
                  key={member.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={
                        member.role === "admin" ? "default" : 
                        member.role === "manager" ? "secondary" : "outline"
                      }
                      className="capitalize"
                    >
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          member.isActive ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-foreground">
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-muted-foreground">
                      {member.lastSeenAt
                        ? new Date(member.lastSeenAt).toLocaleDateString()
                        : "Never"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-muted-foreground hover:text-foreground">
                      <IconDots size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="invite" />
            
            {showSuccess && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <IconCheck size={16} className="text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {fetcher?.data?.message}
                </AlertDescription>
              </Alert>
            )}

            {showError && (
              <Alert variant="destructive">
                <AlertDescription>{fetcher?.data?.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="colleague@company.com"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select 
                name="role" 
                value={selectedRole} 
                onValueChange={setSelectedRole}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === "admin" && "Full access to all features and settings"}
                {selectedRole === "manager" && "Can view team reports and manage employees"}
                {selectedRole === "employee" && "Can track time and view own reports"}
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send invitation"}
            </Button>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}