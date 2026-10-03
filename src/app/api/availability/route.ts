import { z } from "zod";
import { db } from "@/lib/db";
import { allocateTables, localDateTime } from "@/lib/domain";
import { freeTables } from "@/lib/booking";
import { apiError } from "@/lib/http";
import { HttpError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(query.get("date"));
    const guests = z.coerce.number().int().min(1).max(40).parse(query.get("guests"));
    const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    const tableId = query.get("tableId");
    const floor = query.get("floor") === "1";
    if ((tableId || floor) && !settings.floorBookingEnabled) throw new HttpError("La reservation sur plan est desactivee.", 409);
    const tables = floor ? await db.diningTable.findMany({ where: { active: true, planX: { not: null }, planY: { not: null } }, select: { id: true, name: true, seats: true, area: true, planX: true, planY: true }, orderBy: { name: "asc" } }) : [];
    const closed = (settings.closedDates as string[]).includes(date) || guests > settings.maxGuests;
    const slots = await Promise.all((settings.serviceTimes as string[]).map(async time => {
      const startsAt = localDateTime(date, time);
      const endsAt = new Date(startsAt.getTime() + (settings.durationMinutes + settings.cleanupMinutes) * 60000);
      const open = !closed && startsAt.getTime() > Date.now() + 15 * 60000 && startsAt.getTime() < Date.now() + 180 * 86400000;
      const free = open ? await freeTables(db, startsAt, endsAt) : [];
      const available = tableId ? free.some(table => table.id === tableId && table.seats >= guests && table.planX !== null && table.planY !== null) : !!allocateTables(free, guests);
      return { time, available, ...(floor ? { tables: tables.map(table => ({ ...table, available: free.some(item => item.id === table.id && item.seats >= guests) })) } : {}) };
    }));
    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}