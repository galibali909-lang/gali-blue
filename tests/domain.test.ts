import test from "node:test";
import assert from "node:assert/strict";
import { allocateTables, calculatePrice, canTransition, localDateTime, dateLabel } from "../src/lib/domain";
import { demoFloorTables } from "../src/lib/floor-layout";

test("on-site payment never receives an online discount", () => {
  assert.equal(calculatePrice(30000, "ON_SITE", true, 15).total, 30000);
  assert.equal(calculatePrice(30000, "ONLINE", true, 15).total, 25500);
  assert.equal(calculatePrice(30000, "ONLINE", false, 15).discountAmount, 0);
  assert.throws(() => calculatePrice(100, "ONLINE", true, 101));
});
test("tables cannot be combined across spaces or without a join group", () => {
  const tables = [
    { id: "one", seats: 2, area: "Salle", joinGroup: null },
    { id: "two", seats: 2, area: "Salle", joinGroup: null },
  ];
  assert.equal(allocateTables(tables, 4), null);
  assert.equal(allocateTables(tables.map(table => ({ ...table, joinGroup: "A" })), 4)?.length, 2);
  assert.equal(allocateTables(tables.map((table, index) => ({ ...table, joinGroup: "A", area: `${index}` })), 4), null);
});
test("the smallest compatible single table is selected", () => {
  assert.equal(allocateTables([
    { id: "large", seats: 6, area: "Salle", joinGroup: null },
    { id: "small", seats: 4, area: "Salle", joinGroup: null },
  ], 3)?.[0].id, "small");
});
test("staff cannot manufacture a CMI payment or reopen a cancelled booking", () => {
  assert.equal(canTransition("CALL_PENDING", "RESERVED"), true);
  assert.equal(canTransition("CALL_PENDING", "PROVISIONAL"), false);
  assert.equal(canTransition("PAYMENT_PENDING", "RESERVED"), false);
  assert.equal(canTransition("CANCELLED", "RESERVED"), false);
  assert.equal(canTransition("RESERVED", "ARRIVED"), true);
  assert.equal(canTransition("ARRIVED", "COMPLETED"), true);
});
test("Casablanca local times round-trip and impossible dates are rejected", () => {
  assert.equal(dateLabel(localDateTime("2026-10-15", "19:00")), "15/10/2026 19:00");
  assert.throws(() => localDateTime("2026-02-30", "19:00"));
});
test("the full demo plan has 38 unique units, nine VIP and non-overlapping touch targets", () => {
  assert.equal(demoFloorTables.length, 38);
  assert.equal(new Set(demoFloorTables.map(table => table.name)).size, 38);
  assert.equal(demoFloorTables.filter(table => table.vip).length, 9);
  for (const [index, first] of demoFloorTables.entries()) {
    for (const second of demoFloorTables.slice(index + 1)) {
      assert.ok(Math.abs(first.planX - second.planX) * 12 >= 46 || Math.abs(first.planY - second.planY) * 8.4825 >= 44, `${first.name} overlaps ${second.name}`);
    }
  }
});