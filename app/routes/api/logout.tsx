// ============================================
// FILE: app/routes/api/logout.tsx
// ============================================
import { ActionFunctionArgs, redirect } from "react-router";
import { getSession, destroySession } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);

  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}