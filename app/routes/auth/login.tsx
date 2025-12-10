// ============================================
// FILE: app/routes/auth/login.tsx (SHADCN VERSION)
// ============================================
import { ActionFunctionArgs, Form, redirect, useActionData, useNavigate } from "react-router";
import { authenticateUser } from "~/lib/auth.server";
import { commitSession, getSession } from "~/lib/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const result = await authenticateUser(email, password);

  if (!result) {
    return { error: "Invalid email or password" };
  }

  const session = await getSession(request);
  session.set("token", result.token);
  session.set("userId", result.user.id);

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function Login() {
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center bg-notion-bg">
      <div className="w-full max-w-[420px] mx-auto px-4">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-[32px] font-bold text-notion-text mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-notion-secondary">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-notion-accent font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-notion-border shadow-sm">
            <CardContent className="pt-8 pb-8 px-8">
              <Form method="post">
                <div className="space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor="email" 
                      className="text-sm font-semibold text-notion-text"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      required
                      className="border-notion-border focus-visible:ring-notion-accent"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor="password" 
                      className="text-sm font-semibold text-notion-text"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      className="border-notion-border focus-visible:ring-notion-accent"
                    />
                  </div>

                  {/* Error Message */}
                  {actionData?.error && (
                    <div className="p-3 text-sm bg-red-50 border border-red-200 rounded-md text-red-600">
                      {actionData.error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    Sign in
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}