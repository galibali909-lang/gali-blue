import { mkdir, writeFile } from "node:fs/promises";
import { demoFloorTables } from "../src/lib/floor-layout";

async function main() {
  const folder = new URL("../prisma/migrations/20261004000000_complete_demo_floor/", import.meta.url);
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const rows = demoFloorTables.map(table => `(${quote(table.id)}, ${quote(table.name)}, ${quote(table.area)}, ${table.seats}, ${table.joinGroup ? quote(table.joinGroup) : "NULL"}, true, ${table.planX}, ${table.planY}, ${table.vip}, NOW(3))`);
  const sql = `INSERT INTO DiningTable (id, name, area, seats, joinGroup, active, planX, planY, vip, updatedAt) VALUES\n${rows.join(",\n")}\nON DUPLICATE KEY UPDATE planX = VALUES(planX), planY = VALUES(planY), vip = VALUES(vip);\nUPDATE Reservation SET vip = true WHERE requestedTableId IN (SELECT id FROM DiningTable WHERE vip = true) OR id IN (SELECT B FROM _DiningTableToReservation WHERE A IN (SELECT id FROM DiningTable WHERE vip = true));\n`;
  await mkdir(folder, { recursive: true });
  await writeFile(new URL("migration.sql", folder), sql);
  console.log(`Generated migration for ${demoFloorTables.length} reservable units, including ${demoFloorTables.filter(table => table.vip).length} VIP tables.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });