import { db } from "./db";
import { parseContent } from "./content";
import { cmiReady } from "./booking";
import { dateLabel } from "./domain";

export async function publicData(preview = false) {
  const [settings, menu, events, gallery] = await Promise.all([
    db.settings.findUniqueOrThrow({ where: { id: 1 } }),
    db.menuItem.findMany({ where: { available: true }, orderBy: { position: "asc" } }),
    db.event.findMany({ where: { published: true, date: { gte: new Date() } }, orderBy: [{ position: "asc" }, { date: "asc" }, { id: "asc" }], take: 3 }),
    db.media.findMany({ where: { gallery: true }, orderBy: { position: "asc" } }),
  ]);
  return {
    content: parseContent(preview && settings.draftContent ? settings.draftContent : settings.content),
    menu, gallery, events: events.map(event => ({ ...event, date: event.date.toISOString() })),
    booking: { maxGuests: settings.maxGuests, onlineEnabled: settings.onlineEnabled && cmiReady, discountEnabled: settings.discountEnabled, discountPercent: settings.discountPercent, onlineAmount: settings.onlineAmount,
      classicBookingEnabled: settings.classicBookingEnabled, floorBookingEnabled: settings.floorBookingEnabled, floorPlanImage: settings.floorPlanImage,
      today: dateLabel(new Date(), "yyyy-MM-dd"), tomorrow: dateLabel(new Date(Date.now() + 86400000), "yyyy-MM-dd"), lastDate: dateLabel(new Date(Date.now() + 180 * 86400000), "yyyy-MM-dd"),
    },
  };
}
export type PublicData = Awaited<ReturnType<typeof publicData>>;