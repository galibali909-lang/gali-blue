import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createBooking, updateBooking } from "../src/lib/booking";
import { db } from "../src/lib/db";
import { dateLabel } from "../src/lib/domain";

test("MySQL: concurrent allocation, lifecycle, permissions and online gate", async () => {
  const keys = [randomUUID(), randomUUID(), randomUUID()];
  const actor = { id: "integration-test", name: "Integration test", role: "MANAGER" };
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const table = await db.diningTable.create({ data: { name: `TEST-${keys[0].slice(0, 8)}`, seats: 8, area: "TEST", planX: 2, planY: 2 } });
  const date = dateLabel(new Date(Date.now() + 97 * 86400000), "yyyy-MM-dd");
  const input = { name: "TEST reservation", phone: "+212600000000", date, time: (settings.serviceTimes as string[])[0], guests: 8, tableId: table.id, method: "ON_SITE", consent: true, requestKey: keys[0] };
  try {
    const first = await createBooking(input);
    const duplicate = await createBooking(input);
    assert.equal(duplicate.reference, first.reference);
    await createBooking({ ...input, requestKey: keys[1] });
    const bookings = await db.reservation.findMany({ where: { requestKey: { in: keys } }, include: { tables: true } });
    assert.equal(bookings.length, 2);
    assert.ok(bookings.every(booking => booking.status === "CALL_PENDING" && booking.tables.length === 0 && booking.discountPercent === 0));
    const results = await Promise.allSettled(bookings.map(booking => updateBooking({ id: booking.id, action: "call", callStatus: "CONFIRMED" }, actor)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
    const provisional = await db.reservation.findFirstOrThrow({ where: { requestKey: { in: keys }, status: "RESERVED" }, include: { tables: true } });
    assert.equal(provisional.tables.reduce((sum, table) => sum + table.seats, 0), 8);
    assert.equal(provisional.callStatus, "CONFIRMED");
    await assert.rejects(() => updateBooking({ id: provisional.id, action: "collect", paidAmount: 10000 }, { ...actor, role: "HOST" }), /non autorise/);
    await assert.rejects(() => updateBooking({ id: provisional.id, action: "transition", status: "RESERVED" }, actor), /non autorisee/);
    await assert.rejects(() => updateBooking({ id: provisional.id, action: "transition", status: "NO_SHOW" }, actor), /grace/);
    await assert.rejects(() => createBooking({ ...input, method: "ONLINE", requestKey: keys[2] }), /indisponible/);
    await updateBooking({ id: provisional.id, action: "transition", status: "CANCELLED" }, actor);
    const waiting = bookings.find(booking => booking.id !== provisional.id)!;
    await updateBooking({ id: waiting.id, action: "call", callStatus: "CONFIRMED" }, actor);
    const updated = await db.reservation.findUniqueOrThrow({ where: { id: waiting.id } });
    assert.equal(updated.status, "RESERVED");
    await db.reservation.update({ where: { id: waiting.id }, data: { startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 60 * 60000) } });
    await updateBooking({ id: waiting.id, action: "transition", status: "ARRIVED" }, actor);
    await updateBooking({ id: waiting.id, action: "collect", paidAmount: 95000 }, actor);
    await assert.rejects(() => updateBooking({ id: waiting.id, action: "collect", paidAmount: 95000 }, actor), /impossible/);
    await updateBooking({ id: waiting.id, action: "transition", status: "COMPLETED" }, actor);
    const completed = await db.reservation.findUniqueOrThrow({ where: { id: waiting.id } });
    assert.equal(completed.status, "COMPLETED");
    assert.equal(completed.paidAmount, 95000);
    assert.equal(completed.discountPercent, 0);
  } finally {
    const bookings = await db.reservation.findMany({ where: { requestKey: { in: keys } }, select: { id: true } });
    await db.audit.deleteMany({ where: { reservationId: { in: bookings.map(booking => booking.id) } } });
    await db.reservation.deleteMany({ where: { requestKey: { in: keys } } });
    await db.diningTable.delete({ where: { id: table.id } });
    await db.$disconnect();
  }
});

test("MySQL: floor preference, mode gates, capacity and concurrent confirmation", async () => {
  assert.match(process.env.DATABASE_URL || "", /@(localhost|127\.0\.0\.1):/);
  const original = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const table = await db.diningTable.findFirstOrThrow({ where: { active: true, planX: { not: null }, planY: { not: null } } });
  const keys = Array.from({ length: 6 }, () => randomUUID());
  const actor = { id: "integration-test", name: "Integration test", role: "MANAGER" };
  const input = { name: "TEST floor booking", phone: "+212600000001", date: dateLabel(new Date(Date.now() + 98 * 86400000), "yyyy-MM-dd"), time: (original.serviceTimes as string[])[0], guests: 1, method: "ON_SITE", consent: true, requestKey: keys[0], tableId: table.id };
  try {
    await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: false, classicBookingEnabled: true } });
    await assert.rejects(() => createBooking(input), /desactive/);
    await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: true, classicBookingEnabled: false } });
    await assert.rejects(() => createBooking({ ...input, tableId: undefined }), /desactive/);
    await assert.rejects(() => createBooking({ ...input, tableId: "missing-table" }), /disponible/);
    await assert.rejects(() => createBooking({ ...input, guests: table.seats + 1 }), /disponible|Maximum/);
    await createBooking(input);
    await createBooking({ ...input, requestKey: keys[1] });
    const requests = await db.reservation.findMany({ where: { requestKey: { in: keys } }, include: { tables: true } });
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.requestedTableId === table.id && request.tables.length === 0));
    const confirmations = await Promise.allSettled(requests.map(request => updateBooking({ id: request.id, action: "call", callStatus: "CONFIRMED" }, actor)));
    assert.equal(confirmations.filter(result => result.status === "fulfilled").length, 1);
    const confirmed = await db.reservation.findFirstOrThrow({ where: { requestKey: { in: keys }, status: "RESERVED" }, include: { tables: true } });
    assert.deepEqual(confirmed.tables.map(item => item.id), [table.id]);
    await assert.rejects(() => createBooking({ ...input, requestKey: keys[2] }), /plus disponible/);
    await updateBooking({ id: confirmed.id, action: "transition", status: "CANCELLED" }, actor);
    await createBooking({ ...input, requestKey: keys[3] });
  } finally {
    const requests = await db.reservation.findMany({ where: { requestKey: { in: keys } }, select: { id: true } });
    await db.audit.deleteMany({ where: { reservationId: { in: requests.map(request => request.id) } } });
    await db.reservation.deleteMany({ where: { requestKey: { in: keys } } });
    await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: original.floorBookingEnabled, classicBookingEnabled: original.classicBookingEnabled } });
    await db.$disconnect();
  }
});