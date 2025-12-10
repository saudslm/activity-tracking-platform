// ============================================
// FILE: app/routes/_app.team.tsx (MIGRATED TO SHADCN/UI)
// ============================================
import { useState } from "react";
import { IconPlus, IconDots } from "@tabler/icons-react";
import { db } from "~/lib/db.server";
import { getSession } from "~/lib/session.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
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
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-bold text-notion-text mb-1">
            Team
          </h1>
          <p className="text-sm text-notion-secondary">
            Manage team members and permissions
          </p>
        </div>
        {loaderData.currentUserRole === "admin" && (
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-[#2383E2] hover:bg-[#1d6bc4] font-medium"
          >
            <IconPlus size={16} className="mr-2" />
            Invite member
          </Button>
        )}
      </div>

      {/* Team Table */}
      <Card className="border-notion-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-notion-border bg-gray-50/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-notion-secondary">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-notion-secondary">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-notion-secondary">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-notion-secondary">
                  Last Seen
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loaderData.teamMembers.map((member) => (
                <tr 
                  key={member.id}
                  className="border-b border-notion-border last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-notion-text text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-notion-text">
                          {member.name}
                        </p>
                        <p className="text-xs text-notion-secondary">
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
                      <span className="text-sm text-notion-text">
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-notion-secondary">
                      {member.lastSeenAt
                        ? new Date(member.lastSeenAt).toLocaleDateString()
                        : "Never"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-notion-secondary hover:text-notion-text">
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
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-[#2383E2] hover:bg-[#1d6bc4]">
              Send invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}