import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma, BookingStatus } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./auth";
import { allocateTables, canTransition, localDateTime, occupyingStatuses } from "./domain";

export const cmiReady = false;
export const bookingSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{9,22}$/, "Numero de telephone invalide."),
  email: z.union([z.literal(""), z.email()]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  guests: z.coerce.number().int().min(1).max(40),
  method: z.enum(["ON_SITE", "ONLINE"]),
  note: z.string().max(1000).optional(),
  consent: z.literal(true, { error: "Veuillez accepter les conditions de reservation." }),
  requestKey: z.string().uuid(),
  website: z.string().max(0).optional(),
});
export async function withBookingLock<Result>(operation: (transaction: Prisma.TransactionClient) => Promise<Result>) {
  return db.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT id FROM Settings WHERE id = 1 FOR UPDATE`;
    return operation(transaction);
  }, { maxWait: 10000, timeout: 15000 });
}
export async function freeTables(transaction: Prisma.TransactionClient, startsAt: Date, endsAt: Date, excludeId?: string) {
  return transaction.diningTable.findMany({ where: { active: true, bookings: { none: {
    ...(excludeId ? { id: { not: excludeId } } : {}),
    startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
    OR: [
      { status: { in: [...occupyingStatuses] } },
      { status: "PAYMENT_PENDING", holdUntil: { gt: new Date() } },
    ],
  } } }, orderBy: { seats: "asc" } });
}
export async function createBooking(raw: unknown, actor = "Client") {
  const input = bookingSchema.parse(raw);
  return withBookingLock(async transaction => {
    const existing = await transaction.reservation.findUnique({ where: { requestKey: input.requestKey } });
    if (existing) return { reference: existing.reference, status: existing.status };
    const settings = await transaction.settings.findUniqueOrThrow({ where: { id: 1 } });
    if (input.method === "ONLINE" && (!settings.onlineEnabled || !cmiReady)) throw new HttpError("Le paiement en ligne est actuellement indisponible.", 409);
    if (input.guests > settings.maxGuests) throw new HttpError(`Maximum ${settings.maxGuests} personnes par demande.`);
    if (!(settings.serviceTimes as string[]).includes(input.time) || (settings.closedDates as string[]).includes(input.date)) throw new HttpError("Ce service est ferme.", 409);
    let startsAt: Date;
    try { startsAt = localDateTime(input.date, input.time); } catch { throw new HttpError("Date invalide."); }
    if (startsAt.getTime() < Date.now() + 15 * 60000 || startsAt.getTime() > Date.now() + 180 * 86400000) throw new HttpError("Choisissez une date future dans les 6 prochains mois.");
    const endsAt = new Date(startsAt.getTime() + (settings.durationMinutes + settings.cleanupMinutes) * 60000);
    const selected = allocateTables(await freeTables(transaction, startsAt, endsAt), input.guests);
    if (!selected) throw new HttpError("Aucune table compatible n'est disponible pour ce service.", 409);
    const reservation = await transaction.reservation.create({ data: {
      reference: `GB-${randomBytes(4).toString("hex").toUpperCase()}`,
      requestKey: input.requestKey, name: input.name, phone: input.phone, email: input.email || null,
      guests: input.guests, startsAt, endsAt, method: input.method, note: input.note,
      status: "CALL_PENDING", paymentStatus: "ON_SITE_DUE",
      audits: { create: { actor, action: "CREATION", detail: "Demande enregistree, paiement sur place, aucune remise." } },
    } });
    return { reference: reservation.reference, status: reservation.status };
  });
}
export const bookingUpdateSchema = z.object({
  id: z.string(), action: z.enum(["transition", "call", "assign", "collect", "note"]),
  status: z.nativeEnum(BookingStatus).optional(),
  callStatus: z.enum(["TO_CALL", "NO_ANSWER", "CONFIRMED", "CANCEL_REQUESTED"]).optional(),
  tableIds: z.array(z.string()).max(20).optional(), staffId: z.string().nullable().optional(),
  paidAmount: z.coerce.number().int().min(1).max(100000000).optional(),
  note: z.string().trim().max(1000).optional(),
});
export async function updateBooking(raw: unknown, actor: { name: string; role: string; id: string }) {
  const input = bookingUpdateSchema.parse(raw);
  return withBookingLock(async transaction => {
    const reservation = await transaction.reservation.findUnique({ where: { id: input.id }, include: { tables: true } });
    if (!reservation) throw new HttpError("Reservation introuvable.", 404);
    const settings = await transaction.settings.findUniqueOrThrow({ where: { id: 1 } });
    const manager = ["ADMIN", "MANAGER", "HOST"].includes(actor.role);
    const data: Prisma.ReservationUpdateInput = {};
    let detail = "";
    if (input.action === "transition") {
      const next = input.status!;
      const serviceAllowed = actor.role === "SERVICE" && reservation.assignedStaffId === actor.id && ["ARRIVED", "COMPLETED"].includes(next);
      if (!manager && !serviceAllowed) throw new HttpError("Action non autorisee.", 403);
      if (!next || !canTransition(reservation.status, next)) throw new HttpError("Transition de statut non autorisee.", 409);
      if (next === "PROVISIONAL") {
        if (reservation.startsAt <= new Date()) throw new HttpError("Le service est deja passe.", 409);
        const available = await freeTables(transaction, reservation.startsAt, reservation.endsAt, reservation.id);
        const selected = allocateTables(available, reservation.guests);
        if (!selected) throw new HttpError("Plus de table compatible disponible.", 409);
        data.tables = { set: selected.map(table => ({ id: table.id })) };
        data.callStatus = "CONFIRMED";
      }
      if (next === "NO_SHOW" && Date.now() < reservation.startsAt.getTime() + settings.graceMinutes * 60000) throw new HttpError("Le delai de grace n'est pas ecoule.");
      if (next === "ARRIVED" && (Date.now() < reservation.startsAt.getTime() - 60 * 60000 || Date.now() > reservation.endsAt.getTime())) throw new HttpError("L'arrivee doit correspondre au service reserve.");
      if (next === "COMPLETED") data.endsAt = new Date(Date.now() + settings.cleanupMinutes * 60000);
      if (next === "CANCELLED" && reservation.paymentStatus === "PAID") data.paymentStatus = "REFUND_PENDING";
      data.status = next;
      detail = `${reservation.status} -> ${next}${input.note ? ` : ${input.note}` : ""}`;
    } else if (input.action === "call") {
      if (!manager || !input.callStatus) throw new HttpError("Action non autorisee.", 403);
      data.callStatus = input.callStatus;
      detail = `Appel : ${input.callStatus}${input.note ? ` - ${input.note}` : ""}`;
    } else if (input.action === "assign") {
      if (!manager) throw new HttpError("Action non autorisee.", 403);
      if (!["PROVISIONAL", "RESERVED"].includes(reservation.status)) throw new HttpError("Affectation possible sur une reservation provisoire ou reservee.");
      if (input.tableIds) {
        const free = await freeTables(transaction, reservation.startsAt, reservation.endsAt, reservation.id);
        const selected = free.filter(table => input.tableIds!.includes(table.id));
        if (!selected.length || selected.length !== input.tableIds.length || selected.reduce((sum, table) => sum + table.seats, 0) < reservation.guests) throw new HttpError("Tables indisponibles ou capacite insuffisante.", 409);
        if (selected.length > 1 && (!selected[0].joinGroup || !selected.every(table => table.area === selected[0].area && table.joinGroup === selected[0].joinGroup))) throw new HttpError("Ces tables ne peuvent pas etre reunies.");
        data.tables = { set: selected.map(table => ({ id: table.id })) };
      }
      if (input.staffId !== undefined) {
        if (input.staffId && !await transaction.staff.findFirst({ where: { id: input.staffId, active: true } })) throw new HttpError("Membre du personnel indisponible.");
        data.assignedStaff = input.staffId ? { connect: { id: input.staffId } } : { disconnect: true };
      }
      detail = "Affectation des tables et du personnel mise a jour.";
    } else if (input.action === "collect") {
      if (!["ADMIN", "MANAGER", "CASHIER"].includes(actor.role)) throw new HttpError("Encaissement non autorise.", 403);
      if (reservation.method !== "ON_SITE" || reservation.paymentStatus === "PAID" || !["ARRIVED", "COMPLETED"].includes(reservation.status) || !input.paidAmount) throw new HttpError("Encaissement impossible pour cette reservation.");
      data.paymentStatus = "PAID"; data.paidAmount = input.paidAmount;
      detail = `Encaissement sur place : ${input.paidAmount} centimes. Aucune remise en ligne.`;
    } else {
      if (!manager || !input.note) throw new HttpError("Note vide ou action non autorisee.");
      detail = input.note;
    }
    const updated = await transaction.reservation.update({ where: { id: reservation.id }, data });
    await transaction.audit.create({ data: { actor: actor.name, action: input.action.toUpperCase(), detail, reservationId: reservation.id } });
    return updated;
  });
}