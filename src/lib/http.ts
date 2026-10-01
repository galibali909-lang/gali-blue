import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./auth";

export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin) {
    throw new HttpError("Origine de la requete refusee.", 403);
  }
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError("Format JSON attendu.");
  const text = await request.text();
  if (text.length > 65000) throw new HttpError("Requete trop volumineuse.", 413);
  try { return JSON.parse(text); } catch { throw new HttpError("Requete invalide."); }
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const now = new Date();
  await db.rateLimit.deleteMany({ where: { key: hashed, expiresAt: { lte: now } } });
  const counter = await db.rateLimit.upsert({ where: { key: hashed },
    create: { key: hashed, hits: 1, expiresAt: new Date(now.getTime() + seconds * 1000) },
    update: { hits: { increment: 1 } },
  });
  if (counter.hits > limit) throw new HttpError("Trop de tentatives. Veuillez reessayer plus tard.", 429);
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message || "Donnees invalides." }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "Cette reference existe deja." }, { status: 409 });
  console.error("API failure", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "Operation impossible. Veuillez reessayer." }, { status: 500 });
}