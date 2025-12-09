// ============================================
// FILE: app/routes/_app._index.tsx
// ============================================
import { LoaderFunctionArgs, redirect } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return redirect("/dashboard");
}