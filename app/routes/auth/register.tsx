// ============================================
// FILE: app/routes/auth/register.tsx (MIGRATED TO SHADCN/UI)
// ============================================
import { ActionFunctionArgs, Form, redirect, useActionData, useNavigate } from "react-router";
import { hashPassword } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { users, organizations } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

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
    <div className="min-h-screen flex items-center bg-notion-bg">
      <div className="w-full max-w-[420px] mx-auto px-4">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-[32px] font-bold text-notion-text mb-2">
              Create your account
            </h1>
            <p className="text-sm text-notion-secondary">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-[#2383E2] font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-notion-border p-8 shadow-lg">
            <Form method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-notion-text font-semibold">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-notion-text font-semibold">
                  Work Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-notion-text font-semibold">
                  Organization Name
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  placeholder="Acme Inc"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-notion-text font-semibold">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
                  {actionData.error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#2383E2] hover:bg-[#1d6bc4] font-semibold h-11"
              >
                Create account
              </Button>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}