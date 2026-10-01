import { z } from "zod";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireStaff, HttpError, contentRoles, managementRoles } from "@/lib/auth";
import { apiError, checkOrigin, jsonBody } from "@/lib/http";
import { bookingSchema, cmiReady, createBooking, updateBooking, withBookingLock } from "@/lib/booking";
import { dashboardData } from "@/lib/dashboard";
import { defaultContent } from "@/lib/content";
import { localDateTime } from "@/lib/domain";

const localMedia = z.string().max(300).refine(value => !value || /^\/(images\/[a-zA-Z0-9_.-]+|api\/media\/[a-zA-Z0-9_.-]+)$/.test(value), "Selectionnez un fichier de la mediatheque.");
const tableSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(30), area: z.string().trim().min(1).max(50), seats: z.coerce.number().int().min(1).max(40), joinGroup: z.string().max(30).nullable().optional(), active: z.boolean() });
const menuSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(100), description: z.string().max(2000), category: z.string().min(1).max(50), price: z.coerce.number().int().min(0).max(10000000), image: localMedia.nullable().optional(), allergens: z.string().max(300).nullable().optional(), available: z.boolean(), position: z.coerce.number().int().min(0).max(10000) });
const staffSchema = z.object({ id: z.string().optional(), name: z.string().min(2).max(100), email: z.union([z.email(), z.literal("")]).optional(), phone: z.string().max(30).nullable().optional(), job: z.string().min(1).max(100), role: z.enum(["ADMIN", "MANAGER", "HOST", "SERVICE", "CASHIER", "EDITOR"]), password: z.string().max(72).optional(), image: localMedia.nullable().optional(), shift: z.string().max(200).nullable().optional(), active: z.boolean() });
const settingsSchema = z.object({ onlineEnabled: z.boolean(), discountEnabled: z.boolean(), discountPercent: z.coerce.number().int().min(0).max(100), onlineAmount: z.coerce.number().int().min(0).max(10000000), maxGuests: z.coerce.number().int().min(1).max(40), durationMinutes: z.coerce.number().int().min(30).max(360), cleanupMinutes: z.coerce.number().int().min(0).max(120), holdMinutes: z.coerce.number().int().min(5).max(60), graceMinutes: z.coerce.number().int().min(0).max(120), serviceTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(24), closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(365) });

export async function GET() {
  try { return Response.json(await dashboardData(await requireStaff()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = await requireStaff();
    const raw = await jsonBody(request);
    const resource = z.enum(["reservation", "newReservation", "table", "staff", "menu", "event", "media", "settings", "content"]).parse(raw.resource);
    if (resource === "reservation") return Response.json(await updateBooking(raw.data, actor));
    if (resource === "newReservation") {
      if (!["ADMIN", "MANAGER", "HOST"].includes(actor.role)) throw new HttpError("Action non autorisee.", 403);
      return Response.json(await createBooking(bookingSchema.parse(raw.data), actor.name));
    }
    const roles = ["menu", "event", "media", "content"].includes(resource) ? contentRoles : managementRoles;
    if (!roles.includes(actor.role)) throw new HttpError("Action non autorisee.", 403);
    await withBookingLock(async transaction => {
      if (resource === "table") {
        const { id, ...data } = tableSchema.parse(raw.data);
        if (id) {
          const old = await transaction.diningTable.findUniqueOrThrow({ where: { id } });
          const occupied = await transaction.reservation.count({ where: { tables: { some: { id } }, endsAt: { gt: new Date() }, OR: [{ status: { in: ["PROVISIONAL", "RESERVED", "ARRIVED", "COMPLETED"] } }, { status: "PAYMENT_PENDING", holdUntil: { gt: new Date() } }] } });
          if (occupied && (data.seats < old.seats || !data.active || data.area !== old.area || (data.joinGroup || null) !== old.joinGroup)) throw new HttpError("Cette table a des reservations. Reaffectez-les avant de reduire sa capacite ou de la desactiver.", 409);
          await transaction.diningTable.update({ where: { id }, data: { ...data, joinGroup: data.joinGroup || null } });
        } else await transaction.diningTable.create({ data: { ...data, joinGroup: data.joinGroup || null } });
      }
      if (resource === "menu") {
        const { id, ...data } = menuSchema.parse(raw.data);
        if (id) await transaction.menuItem.update({ where: { id }, data });
        else await transaction.menuItem.create({ data });
      }
      if (resource === "staff") {
        const { id, password, ...data } = staffSchema.parse(raw.data);
        const old = id ? await transaction.staff.findUniqueOrThrow({ where: { id } }) : null;
        if (actor.role !== "ADMIN" && (password || data.role !== "SERVICE" || (old && old.role !== "SERVICE"))) throw new HttpError("Seul un administrateur peut gerer les comptes et les roles.", 403);
        if (id === actor.id && (!data.active || data.role !== actor.role)) throw new HttpError("Vous ne pouvez pas retirer votre propre acces.");
        if (old?.role === "ADMIN" && (data.role !== "ADMIN" || !data.active) && await transaction.staff.count({ where: { role: "ADMIN", active: true } }) <= 1) throw new HttpError("Conservez au moins un administrateur actif.");
        if (password && (password.length < 12 || !data.email)) throw new HttpError("Un compte requiert un email et un mot de passe de 12 caracteres minimum.");
        const staffData = { ...data, email: data.email?.toLowerCase() || null, ...(password ? { passwordHash: await hash(password, 12) } : {}) };
        if (id) await transaction.staff.update({ where: { id }, data: { ...staffData, sessionVersion: { increment: 1 } } });
        else await transaction.staff.create({ data: staffData });
      }
      if (resource === "event") {
        const { id, date, time, ...data } = z.object({ id: z.string().optional(), title: z.string().min(2).max(150), description: z.string().max(3000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), image: localMedia.nullable().optional(), published: z.boolean() }).parse(raw.data);
        const eventData = { ...data, date: localDateTime(date, time) };
        if (id) await transaction.event.update({ where: { id }, data: eventData });
        else await transaction.event.create({ data: eventData });
      }
      if (resource === "media") {
        const { id, ...data } = z.object({ id: z.string(), title: z.string().min(1).max(120), gallery: z.boolean(), position: z.coerce.number().int().min(0).max(10000) }).parse(raw.data);
        await transaction.media.update({ where: { id }, data });
      }
      if (resource === "settings") {
        const data = settingsSchema.parse(raw.data);
        if (data.onlineEnabled && !cmiReady) throw new HttpError("CMI non configure. L'activation sera disponible apres integration et tests du contrat marchand.", 409);
        await transaction.settings.update({ where: { id: 1 }, data: { ...data, serviceTimes: [...new Set(data.serviceTimes)].sort(), closedDates: [...new Set(data.closedDates)] } });
      }
      if (resource === "content") {
        const fields = z.record(z.string(), z.string().max(6000)).parse(raw.data.content);
        const content = { ...defaultContent };
        for (const key of Object.keys(defaultContent) as (keyof typeof defaultContent)[]) if (fields[key] !== undefined) content[key] = fields[key];
        for (const key of ["heroImage", "heroVideo", "storyImage", "logoImage", "logoLightImage"] as const) localMedia.parse(content[key]);
        content.brandName = z.string().trim().min(1).max(80).parse(content.brandName);
        content.brandTagline = z.string().trim().max(120).parse(content.brandTagline);
        for (const image of [content.logoImage, content.logoLightImage]) {
          if (image && !/\.(png|jpe?g|webp)$/i.test(image)) throw new HttpError("Le logo doit etre une image JPEG, PNG ou WebP.");
          if (image.startsWith("/api/media/") && !await transaction.media.findFirst({ where: { url: image, kind: "image" } })) throw new HttpError("Logo introuvable dans la mediatheque.");
        }
        if (content.instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(content.instagram)) throw new HttpError("Lien Instagram invalide.");
        if (content.email && !z.email().safeParse(content.email).success) throw new HttpError("Email de contact invalide.");
        if (content.phone && !/^\+?[0-9 ()-]{9,22}$/.test(content.phone)) throw new HttpError("Telephone invalide.");
        await transaction.settings.update({ where: { id: 1 }, data: raw.data.publish === true ? { content, draftContent: Prisma.DbNull } : { draftContent: content } });
      }
      await transaction.audit.create({ data: { actor: actor.name, action: resource.toUpperCase(), detail: `${resource} mis a jour${typeof raw.data?.name === "string" ? ` : ${raw.data.name.slice(0, 100)}` : ""}.` } });
    });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}