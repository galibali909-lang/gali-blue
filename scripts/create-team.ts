import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { z } from "zod";

async function main() {
  const local = process.argv.includes("--local");
  if (!local && !process.argv.includes("--bootstrap")) throw new Error("Choisir --local ou --bootstrap.");
  if (local) {
    const database = new URL(process.env.DATABASE_URL || "");
    if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT_ID || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/gali_blue") throw new Error("Creation locale limitee a la base gali_blue.");
  }
  const config = z.object({ version: z.literal(1), accounts: z.array(z.object({ id: z.string().regex(/^team-[a-z-]+$/), name: z.string().min(2).max(100), email: z.email(), job: z.string().max(100), role: z.enum(["ADMIN", "MANAGER", "HOST", "SERVICE", "CASHIER", "EDITOR"]), passwordHash: z.string().regex(/^\$2b\$12\$[./A-Za-z0-9]{53}$/) })).length(6) }).parse(JSON.parse(await readFile(new URL("../deployment/bootstrap-team.json", import.meta.url), "utf8")));
  const db = new PrismaClient();
  try {
    let created = 0;
    await db.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM Settings WHERE id = 1 FOR UPDATE`;
      for (const account of config.accounts) {
        const existing = await transaction.staff.findFirst({ where: { OR: [{ id: account.id }, { email: account.email }] } });
        if (existing) continue;
        await transaction.staff.create({ data: { ...account, active: true, mustChangePassword: true } });
        await transaction.audit.create({ data: { actor: "Initialisation equipe", action: "CREATION_COMPTE", detail: `Acces ${account.role} initialise ; renouvellement obligatoire au premier acces.` } });
        created++;
      }
    });
    console.log(`Equipe : ${created} comptes crees, ${config.accounts.length - created} comptes existants conserves. Aucun mot de passe affiche.`);
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof z.ZodError ? "Configuration des comptes invalide." : error instanceof Error ? error.message : "Creation de l'equipe impossible."); process.exitCode = 1; });