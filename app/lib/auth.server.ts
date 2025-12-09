// ============================================
// FILE: app/lib/auth.server.ts
// ============================================
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.server";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: typeof users.$inferSelect; token: string } | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  return { user, token };
}

export async function requireAuth(request: Request): Promise<JWTPayload> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Response("Invalid token", { status: 401 });
  }

  return payload;
}

export async function requireRole(
  request: Request,
  allowedRoles: Array<"admin" | "manager" | "employee">
): Promise<JWTPayload> {
  const payload = await requireAuth(request);

  if (!allowedRoles.includes(payload.role as any)) {
    throw new Response("Forbidden", { status: 403 });
  }

  return payload;
}