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
  const date = dateLabel(new Date(Date.now() + 97 * 86400000), "yyyy-MM-dd");
  const input = { name: "TEST reservation", phone: "+212600000000", date, time: (settings.serviceTimes as string[])[0], guests: 8, method: "ON_SITE", consent: true, requestKey: keys[0] };
  try {
    const first = await createBooking(input);
    const duplicate = await createBooking(input);
    assert.equal(duplicate.reference, first.reference);
    await createBooking({ ...input, requestKey: keys[1] });
    const bookings = await db.reservation.findMany({ where: { requestKey: { in: keys } }, include: { tables: true } });
    assert.equal(bookings.length, 2);
    assert.ok(bookings.every(booking => booking.status === "CALL_PENDING" && booking.tables.length === 0 && booking.discountPercent === 0));
    const results = await Promise.allSettled(bookings.map(booking => updateBooking({ id: booking.id, action: "transition", status: "PROVISIONAL" }, actor)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
    const provisional = await db.reservation.findFirstOrThrow({ where: { requestKey: { in: keys }, status: "PROVISIONAL" }, include: { tables: true } });
    assert.equal(provisional.tables.reduce((sum, table) => sum + table.seats, 0), 8);
    assert.equal(provisional.callStatus, "CONFIRMED");
    await assert.rejects(() => updateBooking({ id: provisional.id, action: "collect", paidAmount: 10000 }, { ...actor, role: "HOST" }), /non autorise/);
    await assert.rejects(() => updateBooking({ id: provisional.id, action: "transition", status: "RESERVED" }, actor), /non autorisee/);
    await assert.rejects(() => updateBooking({ id: provisional.id, action: "transition", status: "NO_SHOW" }, actor), /grace/);
    await assert.rejects(() => createBooking({ ...input, method: "ONLINE", requestKey: keys[2] }), /indisponible/);
    await updateBooking({ id: provisional.id, action: "transition", status: "CANCELLED" }, actor);
    const waiting = bookings.find(booking => booking.id !== provisional.id)!;
    await updateBooking({ id: waiting.id, action: "transition", status: "PROVISIONAL" }, actor);
    const updated = await db.reservation.findUniqueOrThrow({ where: { id: waiting.id } });
    assert.equal(updated.status, "PROVISIONAL");
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
    await db.$disconnect();
  }
});