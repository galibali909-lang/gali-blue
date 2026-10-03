import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { readFile } from "node:fs/promises";
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
    if (!localTest && await db.staff.count({ where: { passwordHash: { not: null } } })) {
      console.log("Comptes de connexion existants conserves. Aucun compte initial ajoute.");
      return;
    }
    const initial = localTest ? null : z.object({ email: z.email(), passwordHash: z.string().regex(/^\$2b\$12\$[./A-Za-z0-9]{53}$/) }).parse(JSON.parse(await readFile(new URL("../deployment/bootstrap-admin.json", import.meta.url), "utf8")));
    const email = z.email().parse(localTest ? "admin@gali-blue.local" : process.env.ADMIN_EMAIL || initial?.email).toLowerCase();
    const customPassword = !localTest && process.env.ADMIN_PASSWORD ? z.string().min(16).max(72).refine(value => !value.startsWith("REPLACE_") && Buffer.byteLength(value, "utf8") <= 72).parse(process.env.ADMIN_PASSWORD) : null;
    const passwordHash = localTest ? await hash("admin", 12) : customPassword ? await hash(customPassword, 12) : initial!.passwordHash;
    await db.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM Settings WHERE id = 1 FOR UPDATE`;
      if (!localTest && await transaction.staff.count({ where: { passwordHash: { not: null } } })) return;
      const existing = await transaction.staff.findUnique({ where: { email } });
      if (existing && (!localTest || existing.name !== "Admin Test")) throw new Error("Cette adresse appartient deja a un compte. Aucun compte modifie.");
      await transaction.staff.upsert({ where: { email }, create: { email, name: localTest ? "Admin Test" : "Administrateur", job: localTest ? "Test local" : "Direction", role: "ADMIN", passwordHash, mustChangePassword: !localTest }, update: { active: true, role: "ADMIN", passwordHash, sessionVersion: { increment: 1 } } });
      await transaction.audit.create({ data: { actor: "Initialisation", action: "CREATION_ADMIN", detail: localTest ? "Compte administrateur de test local initialise." : customPassword ? "Premier administrateur initialise depuis les variables privees du serveur." : "Administrateur de recette initialise depuis le hash du projet. Mot de passe a renouveler." } });
    });
    console.log(`Administrateur initialise : ${email}${localTest ? " (local uniquement)" : ""}`);
  } finally { await db.$disconnect(); }
}

main().catch(error => {
  console.error(error instanceof z.ZodError ? "Configuration initiale invalide. ADMIN_EMAIL doit etre valide et ADMIN_PASSWORD, si fourni, contenir 16 a 72 caracteres." : error instanceof Error ? error.message : "Initialisation impossible.");
  process.exitCode = 1;
});