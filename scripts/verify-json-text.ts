import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
async function main() {
  const database = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/gali_blue" || process.env.NODE_ENV === "production") throw new Error("Test reserve a la base locale gali_blue.");
  const [row] = await db.$queryRaw<{ text: string }[]>`SELECT JSON_UNQUOTE(JSON_EXTRACT(JSON_SET(JSON_OBJECT(), '$.title', CONVERT(FROM_BASE64(SUBSTRING_INDEX('base64:type15:TCdoZXVyZQpibGV1ZS4=', ':', -1)) USING utf8mb4)), '$.title')) AS text`;
  assert.equal(row.text, "L'heure\nbleue.");
  const sql = await readFile(new URL("../prisma/migrations/20261003200000_repair_json_text/migration.sql", import.meta.url), "utf8");
  const rollback = new Error("Rollback verification fixture");
  try {
    await db.$transaction(async transaction => {
      const encoded = "base64:type15:TCdoZXVyZQpibGV1ZS4=";
      await transaction.settings.update({ where: { id: 1 }, data: { content: { eventTitle: encoded, storyTitle: "Texte personnalise", chefName: "Nom conserve" }, draftContent: { eventTitle: "Brouillon personnalise", storyTitle: encoded } } });
      for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await transaction.$executeRawUnsafe(statement);
      const repaired = await transaction.settings.findUniqueOrThrow({ where: { id: 1 } });
      assert.deepEqual(repaired.content, { eventTitle: "L'heure\nbleue.", storyTitle: "Texte personnalise", chefName: "Nom conserve" });
      assert.deepEqual(repaired.draftContent, { eventTitle: "Brouillon personnalise", storyTitle: "L'heure\nbleue." });
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS: MySQL base64 JSON value repaired as UTF-8 multiline text.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());