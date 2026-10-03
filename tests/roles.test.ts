import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { dashboardData } from "../src/lib/dashboard";

test("dashboard data respects editor, service and cashier boundaries", async () => {
  const database = new URL(process.env.DATABASE_URL || "");
  assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/gali_blue");
  const marker = randomUUID();
  const staff = await db.staff.create({ data: { name: "TEST service", job: "Service", role: "SERVICE" } });
  const ids: string[] = [];
  try {
    for (const status of ["ARRIVED", "CALL_PENDING"] as const) {
      const booking = await db.reservation.create({ data: { reference: `ROLE-${marker}-${status}`, requestKey: randomUUID(), name: "TEST role customer", phone: "+212600000123", email: "private@example.test", note: "TEST private note", guests: 2, startsAt: new Date(Date.now() + 86400000), endsAt: new Date(Date.now() + 2 * 86400000), method: "ON_SITE", status, assignedStaffId: status === "ARRIVED" ? staff.id : null, audits: { create: { actor: "TEST", action: "NOTE", detail: "TEST private audit" } } } });
      ids.push(booking.id);
    }
    const service = await dashboardData({ id: staff.id, name: staff.name, role: "SERVICE", image: null });
    assert.ok(service.reservations.every(reservation => reservation.assignedStaffId === staff.id));
    assert.equal(service.settings.draftContent, null);
    const cashier = await dashboardData({ id: staff.id, name: "TEST cashier", role: "CASHIER", image: null });
    assert.ok(cashier.reservations.every(reservation => ["ARRIVED", "COMPLETED"].includes(reservation.status) && !reservation.phone && !reservation.email && !reservation.note && reservation.audits.every(audit => audit.action === "COLLECT")));
    assert.ok(cashier.reservations.some(reservation => reservation.id === ids[0]));
    assert.ok(!cashier.reservations.some(reservation => reservation.id === ids[1]));
    const editor = await dashboardData({ id: staff.id, name: "TEST editor", role: "EDITOR", image: null });
    assert.equal(editor.reservations.length, 0);
    assert.equal(editor.tables.length, 0);
    assert.equal(editor.members.length, 0);
    assert.equal(editor.audits.length, 0);
  } finally {
    await db.audit.deleteMany({ where: { reservationId: { in: ids } } });
    await db.reservation.deleteMany({ where: { id: { in: ids } } });
    await db.staff.delete({ where: { id: staff.id } });
    await db.$disconnect();
  }
});