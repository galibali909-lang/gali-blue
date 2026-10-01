import { z } from "zod";
import { db } from "@/lib/db";
import { allocateTables, localDateTime } from "@/lib/domain";
import { freeTables } from "@/lib/booking";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(query.get("date"));
    const guests = z.coerce.number().int().min(1).max(40).parse(query.get("guests"));
    const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    const closed = (settings.closedDates as string[]).includes(date) || guests > settings.maxGuests;
    const slots = await Promise.all((settings.serviceTimes as string[]).map(async time => {
      const startsAt = localDateTime(date, time);
      const endsAt = new Date(startsAt.getTime() + (settings.durationMinutes + settings.cleanupMinutes) * 60000);
      const available = !closed && startsAt.getTime() > Date.now() + 15 * 60000 && startsAt.getTime() < Date.now() + 180 * 86400000 && !!allocateTables(await freeTables(db, startsAt, endsAt), guests);
      return { time, available };
    }));
    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}