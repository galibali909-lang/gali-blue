import { db } from "./db";
import { cmiReady } from "./booking";
import { parseContent } from "./content";

type Serialized<Value> = Value extends Date ? string : Value extends Array<infer Item> ? Serialized<Item>[] : Value extends object ? { [Key in keyof Value]: Serialized<Value[Key]> } : Value;

export async function dashboardData(staff: { id: string; name: string; role: string; image: string | null }) {
  const editorial = ["ADMIN", "MANAGER", "EDITOR"].includes(staff.role);
  const operational = staff.role !== "EDITOR";
  const management = ["ADMIN", "MANAGER"].includes(staff.role);
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const [reservations, tables, members, menu, events, media, audits] = await Promise.all([
    operational ? db.reservation.findMany({ where: staff.role === "SERVICE" ? { assignedStaffId: staff.id } : {}, include: { tables: true, audits: { orderBy: { createdAt: "desc" } }, assignedStaff: { select: { id: true, name: true } } }, orderBy: { startsAt: "desc" }, take: 500 }) : [],
    operational ? db.diningTable.findMany({ orderBy: { name: "asc" } }) : [],
    operational ? db.staff.findMany({ select: { id: true, name: true, role: true, job: true, active: true, image: true, ...(management ? { email: true, phone: true, shift: true } : {}) }, orderBy: { name: "asc" } }) : [],
    editorial ? db.menuItem.findMany({ orderBy: { position: "asc" } }) : [],
    editorial ? db.event.findMany({ orderBy: { date: "asc" } }) : [],
    editorial ? db.media.findMany({ orderBy: { position: "asc" } }) : [],
    management ? db.audit.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) : [],
  ]);
  const result = { staff, reservations, tables, members, menu, events, media, audits, cmiReady,
    settings: { ...settings, content: parseContent(settings.content), draftContent: settings.draftContent ? parseContent(settings.draftContent) : null },
  };
  return JSON.parse(JSON.stringify(result)) as Serialized<typeof result>;
}

export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;