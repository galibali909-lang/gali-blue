import { publicData } from "@/lib/public-data";
import { SiteFooter, SiteNav } from "@/components/public-ui";
import { ReservationForm } from "@/components/reservation-form";
import { BookingModes } from "@/components/floor-plan";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reserver une table" };
export default async function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { content, booking } = await publicData();
  const query = await searchParams;
  const selection = z.object({ table: z.string().min(1).max(191), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), guests: z.coerce.number().int().min(1).max(booking.maxGuests) }).safeParse(query);
  const table = booking.floorBookingEnabled && selection.success ? await db.diningTable.findFirst({ where: { id: selection.data.table, active: true, planX: { not: null }, planY: { not: null }, seats: { gte: selection.data.guests } } }) : null;
  if (!booking.classicBookingEnabled && !table) redirect("/salle");
  const initial = table && selection.success ? { tableId: table.id, tableName: table.name, vip: table.vip, date: selection.data.date, time: selection.data.time, guests: selection.data.guests } : undefined;
  return <><SiteNav content={content}/><main className="section inner-page"><div className="page-intro compact"><p className="eyebrow">LES BONS MOMENTS COMMENCENT ICI</p><h1>Votre table, chez Gali.</h1></div><BookingModes settings={booking} active={initial ? "floor" : "classic"}/>{query.table && !initial && <p className="form-error" role="alert">La table choisie est indisponible. Vous pouvez effectuer une nouvelle demande.</p>}<ReservationForm key={JSON.stringify(initial)} initial={initial} settings={booking} terms={content.bookingTerms} content={content}/></main><SiteFooter content={content}/></>;
}