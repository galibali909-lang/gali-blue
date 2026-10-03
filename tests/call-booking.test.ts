import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createBooking, updateBooking, freeTables } from "../src/lib/booking";
import { db } from "../src/lib/db";
import { dateLabel } from "../src/lib/domain";

test("phone confirmation atomically reserves tables; no-answer cannot undo it", async () => {
  const database = new URL(process.env.DATABASE_URL || "");
  assert.ok(["localhost", "127.0.0.1"].includes(database.hostname));
  const key = randomUUID();
  const actor = { id: "test-call", name: "Test calls", role: "MANAGER" };
  try {
    const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    await createBooking({ name: "TEST call lifecycle", phone: "+212600000003", date: dateLabel(new Date(Date.now() + 101 * 86400000), "yyyy-MM-dd"), time: (settings.serviceTimes as string[])[0], guests: 2, method: "ON_SITE", consent: true, requestKey: key }, actor.name);
    const request = await db.reservation.findUniqueOrThrow({ where: { requestKey: key } });
    await updateBooking({ id: request.id, action: "call", callStatus: "NO_ANSWER" }, actor);
    const pending = await db.reservation.findUniqueOrThrow({ where: { id: request.id }, include: { tables: true } });
    assert.equal(pending.status, "CALL_PENDING");
    assert.equal(pending.tables.length, 0);
    const confirmed = await updateBooking({ id: request.id, action: "call", callStatus: "CONFIRMED" }, actor);
    assert.equal(confirmed.status, "RESERVED");
    assert.equal(confirmed.callStatus, "CONFIRMED");
    assert.ok((await db.reservation.findUniqueOrThrow({ where: { id: request.id }, include: { tables: true } })).tables.length > 0);
    await assert.rejects(() => updateBooking({ id: request.id, action: "call", callStatus: "NO_ANSWER" }, actor), /non encore confirmee/);
    const cancelled = await updateBooking({ id: request.id, action: "call", callStatus: "CANCEL_REQUESTED" }, actor);
    assert.equal(cancelled.status, "CANCELLED");
  } finally {
    const request = await db.reservation.findUnique({ where: { requestKey: key } });
    if (request) { await db.audit.deleteMany({ where: { reservationId: request.id } }); await db.reservation.delete({ where: { id: request.id } }); }
    await db.$disconnect();
  }
});

test("multi-client standard/VIP and classic/floor phone use cases", async () => {
  const database = new URL(process.env.DATABASE_URL || "");
  assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/gali_blue" && process.env.NODE_ENV !== "production");
  const original = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const originalTables = await db.diningTable.findMany({ select: { id: true, active: true } });
  const marker = randomUUID().slice(0, 8);
  const keys: string[] = [];
  const fixtureIds: string[] = [];
  const results: { id: string; title: string; result: string }[] = [];
  const actor = { id: "test-call", name: `Scenarios ${marker}`, role: "MANAGER" };
  const date = dateLabel(new Date(Date.now() + 104 * 86400000), "yyyy-MM-dd");
  const time = (original.serviceTimes as string[])[0];
  async function scenario(title: string, run: () => Promise<void>) { await run(); results.push({ id: `R${String(results.length + 1).padStart(2, "0")}`, title, result: "PASS" }); }
  function input(overrides: Record<string, unknown> = {}) {
    const requestKey = randomUUID(); keys.push(requestKey);
    return { name: `Client ${keys.length} ${marker}`, phone: "+212600000005", date, time, guests: 2, method: "ON_SITE", consent: true, requestKey, ...overrides };
  }
  async function request(overrides: Record<string, unknown> = {}) {
    const data = input(overrides); await createBooking(data);
    return db.reservation.findUniqueOrThrow({ where: { requestKey: data.requestKey }, include: { tables: true } });
  }
  const confirm = (id: string) => updateBooking({ id, action: "call", callStatus: "CONFIRMED" }, actor);
  const cancel = (id: string) => updateBooking({ id, action: "transition", status: "CANCELLED" }, actor);
  try {
    await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: true, classicBookingEnabled: true, closedDates: [], maxGuests: 12 } });
    await db.diningTable.updateMany({ where: { id: { in: originalTables.map(table => table.id) } }, data: { active: false } });
    const fixtures = [];
    for (const [index, spec] of [{ seats: 2, vip: false }, { seats: 4, vip: false }, { seats: 4, vip: false, joinGroup: "TEST" }, { seats: 4, vip: false, joinGroup: "TEST" }, { seats: 4, vip: true }, { seats: 6, vip: true }].entries()) {
      const table = await db.diningTable.create({ data: { ...spec, name: `CASE-${marker}-${index}`, area: "TEST", planX: 10 + index * 10, planY: 20 } });
      fixtures.push(table); fixtureIds.push(table.id);
    }
    const [standardSmall, standardLarge, joinedFirst, joinedSecond, vipSmall, vipLarge] = fixtures;
    await scenario("Telephone invalide refuse", () => assert.rejects(() => createBooking(input({ phone: "abc" }))));
    await scenario("Consentement absent refuse", () => assert.rejects(() => createBooking(input({ consent: false }))));
    await scenario("Date impossible refusee", () => assert.rejects(() => createBooking(input({ date: "2026-02-30" })), /Date invalide/));
    await scenario("Date passee refusee", () => assert.rejects(() => createBooking(input({ date: "2020-01-01" })), /future/));
    await scenario("Date au-dela de six mois refusee", () => assert.rejects(() => createBooking(input({ date: dateLabel(new Date(Date.now() + 200 * 86400000), "yyyy-MM-dd") })), /future/));
    await scenario("Service ferme refuse", () => assert.rejects(() => createBooking(input({ time: "03:17" })), /ferme/));
    await scenario("Jour de fermeture refuse", async () => { await db.settings.update({ where: { id: 1 }, data: { closedDates: [date] } }); await assert.rejects(() => createBooking(input()), /ferme/); await db.settings.update({ where: { id: 1 }, data: { closedDates: [] } }); });
    await scenario("Groupe au-dela du maximum refuse", () => assert.rejects(() => createBooking(input({ guests: 13 })), /Maximum/));
    await scenario("Table inconnue refusee", () => assert.rejects(() => createBooking(input({ tableId: "inconnue" })), /disponible/));
    await scenario("Table trop petite refusee sur le plan", () => assert.rejects(() => createBooking(input({ tableId: standardSmall.id, guests: 3 })), /disponible/));
    await scenario("Table inactive refusee", async () => { await db.diningTable.update({ where: { id: standardSmall.id }, data: { active: false } }); await assert.rejects(() => createBooking(input({ tableId: standardSmall.id })), /disponible/); await db.diningTable.update({ where: { id: standardSmall.id }, data: { active: true } }); });
    await scenario("CMI refuse et aucune remise sur place", async () => { await assert.rejects(() => createBooking(input({ method: "ONLINE" })), /indisponible/); const booking = await request(); assert.equal(booking.discountPercent, 0); assert.equal(booking.paidAmount, 0); });
    await scenario("Double clic idempotent", async () => { const data = input(); const answers = await Promise.all([createBooking(data), createBooking(data)]); assert.equal(answers[0].reference, answers[1].reference); assert.equal(await db.reservation.count({ where: { requestKey: data.requestKey } }), 1); });
    await scenario("Classique standard ne recoit pas de table VIP", async () => { const booking = await request(); await confirm(booking.id); const saved = await db.reservation.findUniqueOrThrow({ where: { id: booking.id }, include: { tables: true } }); assert.ok(saved.tables.every(table => !table.vip)); await cancel(booking.id); });
    await scenario("Classique VIP recoit exclusivement des tables VIP", async () => { const booking = await request({ vip: true }); await confirm(booking.id); const saved = await db.reservation.findUniqueOrThrow({ where: { id: booking.id }, include: { tables: true } }); assert.ok(saved.tables.length && saved.tables.every(table => table.vip)); await cancel(booking.id); });
    await scenario("Plan VIP derive la categorie reelle, pas celle falsifiee du client", async () => { const booking = await request({ tableId: vipSmall.id, vip: false }); assert.equal(booking.vip, true); await confirm(booking.id); await cancel(booking.id); });
    await scenario("Appel sans reponse conserve une demande non bloquante avec rappel", async () => { const booking = await request(); await updateBooking({ id: booking.id, action: "call", callStatus: "NO_ANSWER" }, actor); const saved = await db.reservation.findUniqueOrThrow({ where: { id: booking.id }, include: { tables: true } }); assert.equal(saved.status, "CALL_PENDING"); assert.equal(saved.callAttempts, 1); assert.ok(saved.nextCallAt && saved.lastCalledAt); assert.equal(saved.tables.length, 0); await assert.rejects(() => updateBooking({ id: booking.id, action: "call", callStatus: "NO_ANSWER", nextCallAt: "2020-01-01T00:00:00Z" }, actor), /rappel/); await confirm(booking.id); const confirmed = await db.reservation.findUniqueOrThrow({ where: { id: booking.id } }); assert.equal(confirmed.callAttempts, 2); assert.equal(confirmed.nextCallAt, null); await cancel(booking.id); });
    await scenario("Trois clients, deux parcours, une seule confirmation sur la derniere VIP", async () => { const clients = await Promise.all([request({ vip: true, guests: 6 }), request({ tableId: vipLarge.id, guests: 6 }), request({ tableId: vipLarge.id, guests: 6 })]); const confirmations = await Promise.allSettled(clients.map(client => confirm(client.id))); assert.equal(confirmations.filter(result => result.status === "fulfilled").length, 1); const winner = await db.reservation.findFirstOrThrow({ where: { id: { in: clients.map(client => client.id) }, status: "RESERVED" }, include: { tables: true } }); assert.deepEqual(winner.tables.map(table => table.id), [vipLarge.id]); await assert.rejects(() => createBooking(input({ tableId: vipLarge.id, guests: 6 })), /plus disponible/); await cancel(winner.id); const retry = await request({ tableId: vipLarge.id, guests: 6 }); await confirm(retry.id); await cancel(retry.id); });
    await scenario("Tables reunies seulement au sein du meme groupe standard", async () => { const booking = await request({ guests: 8 }); await confirm(booking.id); const saved = await db.reservation.findUniqueOrThrow({ where: { id: booking.id }, include: { tables: true } }); assert.deepEqual(saved.tables.map(table => table.id).sort(), [joinedFirst.id, joinedSecond.id].sort()); await cancel(booking.id); });
    await scenario("Une affectation ne change pas silencieusement standard en VIP", async () => { const booking = await request({ tableId: standardLarge.id, guests: 4 }); await confirm(booking.id); await assert.rejects(() => updateBooking({ id: booking.id, action: "assign", tableIds: [vipSmall.id] }, actor), /categorie/); await cancel(booking.id); });
    await scenario("Service et caisse ne peuvent pas confirmer les appels", async () => { const booking = await request(); for (const role of ["SERVICE", "CASHIER", "EDITOR"]) await assert.rejects(() => updateBooking({ id: booking.id, action: "call", callStatus: "CONFIRMED" }, { ...actor, role }), /autorise/); });
    await scenario("Annulation pendant l'appel ferme le dossier", async () => { const booking = await request(); const saved = await updateBooking({ id: booking.id, action: "call", callStatus: "CANCEL_REQUESTED" }, actor); assert.equal(saved.status, "CANCELLED"); await assert.rejects(() => confirm(booking.id), /Transition/); });
    await scenario("Arrivee trop tot et absence avant delai refusees", async () => { const booking = await request(); await confirm(booking.id); await assert.rejects(() => updateBooking({ id: booking.id, action: "transition", status: "ARRIVED" }, actor), /arrivee/); await assert.rejects(() => updateBooking({ id: booking.id, action: "transition", status: "NO_SHOW" }, actor), /grace/); await cancel(booking.id); });
    await scenario("Arrivee, encaissement sur place, depart et nettoyage", async () => { const booking = await request({ tableId: standardLarge.id }); await confirm(booking.id); await db.reservation.update({ where: { id: booking.id }, data: { startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 60 * 60000), assignedStaffId: null } }); await assert.rejects(() => updateBooking({ id: booking.id, action: "transition", status: "ARRIVED" }, { ...actor, role: "SERVICE" }), /autorise/); await updateBooking({ id: booking.id, action: "transition", status: "ARRIVED" }, actor); await updateBooking({ id: booking.id, action: "collect", paidAmount: 15000 }, { ...actor, role: "CASHIER" }); await assert.rejects(() => updateBooking({ id: booking.id, action: "collect", paidAmount: 15000 }, { ...actor, role: "CASHIER" }), /impossible/); await updateBooking({ id: booking.id, action: "transition", status: "COMPLETED" }, actor); assert.ok(!(await freeTables(db, new Date(), new Date(Date.now() + 60000))).some(table => table.id === standardLarge.id)); await db.reservation.update({ where: { id: booking.id }, data: { endsAt: new Date(Date.now() - 1000) } }); assert.ok((await freeTables(db, new Date(), new Date(Date.now() + 60000))).some(table => table.id === standardLarge.id)); });
    await scenario("Absence apres delai de grace et liberation de table", async () => { const booking = await request({ tableId: standardSmall.id }); await confirm(booking.id); await db.reservation.update({ where: { id: booking.id }, data: { startsAt: new Date(Date.now() - (original.graceMinutes + 2) * 60000) } }); const saved = await updateBooking({ id: booking.id, action: "transition", status: "NO_SHOW" }, actor); assert.equal(saved.status, "NO_SHOW"); const retry = await request({ tableId: standardSmall.id }); await confirm(retry.id); await cancel(retry.id); });
    await scenario("Les deux interrupteurs sont verifies au serveur", async () => { await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: false } }); await assert.rejects(() => createBooking(input({ tableId: standardSmall.id })), /desactive/); await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: true, classicBookingEnabled: false } }); await assert.rejects(() => createBooking(input()), /desactive/); });
    const folder = new URL("../storage/checks/", import.meta.url);
    await mkdir(folder, { recursive: true });
    await writeFile(new URL("booking-use-cases.json", folder), JSON.stringify({ generatedAt: new Date().toISOString(), success: true, scenarios: results }, null, 2));
    console.log(`PASS: ${results.length} multi-client phone use cases across classic/floor and standard/VIP.`);
  } finally {
    const bookings = await db.reservation.findMany({ where: { requestKey: { in: keys } }, select: { id: true } });
    await db.audit.deleteMany({ where: { reservationId: { in: bookings.map(booking => booking.id) } } });
    await db.reservation.deleteMany({ where: { requestKey: { in: keys } } });
    await db.diningTable.deleteMany({ where: { id: { in: fixtureIds } } });
    for (const active of [true, false]) await db.diningTable.updateMany({ where: { id: { in: originalTables.filter(table => table.active === active).map(table => table.id) } }, data: { active } });
    await db.settings.update({ where: { id: 1 }, data: { floorBookingEnabled: original.floorBookingEnabled, classicBookingEnabled: original.classicBookingEnabled, closedDates: original.closedDates as string[], maxGuests: original.maxGuests } });
    await db.$disconnect();
  }
});