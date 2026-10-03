import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "./db";

type Session = { staffId?: string; version?: number };
export async function getSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error("Session non configuree. Executer npm run db:init.");
  return getIronSession<Session>(await cookies(), {
    password: process.env.SESSION_SECRET,
    cookieName: "gali-session",
    ttl: 60 * 60 * 8,
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/" },
  });
}
export async function currentStaff() {
  const session = await getSession();
  if (!session.staffId) return null;
  const staff = await db.staff.findUnique({ where: { id: session.staffId }, select: {
    id: true, name: true, email: true, role: true, active: true, sessionVersion: true, image: true, mustChangePassword: true,
  } });
  return staff?.active && staff.sessionVersion === session.version ? staff : null;
}
export class HttpError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function requireStaff(roles?: Role[], options: { allowPasswordChange?: boolean } = {}) {
  const staff = await currentStaff();
  if (!staff) throw new HttpError("Connexion requise.", 401);
  if (staff.mustChangePassword && !options.allowPasswordChange) throw new HttpError("Renouvelez votre mot de passe avant d'acceder au dashboard.", 403);
  if (roles && !roles.includes(staff.role)) throw new HttpError("Action non autorisee pour votre role.", 403);
  return staff;
}
export const operationalRoles: Role[] = ["ADMIN", "MANAGER", "HOST"];
export const managementRoles: Role[] = ["ADMIN", "MANAGER"];
export const contentRoles: Role[] = ["ADMIN", "MANAGER", "EDITOR"];