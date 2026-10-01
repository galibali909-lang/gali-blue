import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

async function main() {
  const localTest = process.argv.includes("--local-test");
  if (!localTest && !process.argv.includes("--bootstrap")) throw new Error("Choisir --local-test ou --bootstrap.");
  if (localTest) {
    const database = new URL(process.env.DATABASE_URL || "");
    if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT_ID || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/gali_blue") throw new Error("Le compte de test est limite a la base locale gali_blue.");
  }
  const db = new PrismaClient();
  try {
    if (!localTest && await db.staff.count({ where: { role: "ADMIN", active: true, passwordHash: { not: null } } })) {
      console.log("Administrateur existant conserve.");
      return;
    }
    const email = z.email().parse(localTest ? "admin@gali-blue.local" : process.env.ADMIN_EMAIL).toLowerCase();
    const password = localTest ? "admin" : z.string().min(16).max(72).refine(value => !value.startsWith("REPLACE_")).parse(process.env.ADMIN_PASSWORD);
    const passwordHash = await hash(password, 12);
    await db.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM Settings WHERE id = 1 FOR UPDATE`;
      if (!localTest && await transaction.staff.count({ where: { role: "ADMIN", active: true, passwordHash: { not: null } } })) return;
      const existing = await transaction.staff.findUnique({ where: { email } });
      if (existing && (!localTest || existing.name !== "Admin Test")) throw new Error("Cette adresse appartient deja a un compte. Aucun compte modifie.");
      await transaction.staff.upsert({ where: { email }, create: { email, name: localTest ? "Admin Test" : "Administrateur", job: localTest ? "Test local" : "Direction", role: "ADMIN", passwordHash }, update: { active: true, role: "ADMIN", passwordHash, sessionVersion: { increment: 1 } } });
      await transaction.audit.create({ data: { actor: "Initialisation", action: "CREATION_ADMIN", detail: localTest ? "Compte administrateur de test local initialise." : "Premier administrateur initialise depuis les variables privees du serveur." } });
    });
    console.log(`Administrateur initialise : ${email}${localTest ? " (local uniquement)" : ""}`);
  } finally { await db.$disconnect(); }
}

main().catch(error => {
  console.error(error instanceof z.ZodError ? "ADMIN_EMAIL valide et ADMIN_PASSWORD de 16 a 72 caracteres requis." : error instanceof Error ? error.message : "Initialisation impossible.");
  process.exitCode = 1;
});