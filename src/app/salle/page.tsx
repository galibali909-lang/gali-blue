import { redirect } from "next/navigation";
import { publicData } from "@/lib/public-data";
import { SiteFooter, SiteNav } from "@/components/public-ui";
import { BookingModes, FloorPlan } from "@/components/floor-plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choisir votre table" };
export default async function FloorPage() {
  const { content, booking } = await publicData();
  if (!booking.floorBookingEnabled) redirect("/reserver");
  return <><SiteNav content={content}/><main className="section inner-page"><div className="page-intro compact"><p className="eyebrow">AUTOUR DE LA TABLE</p><h1>Votre place, chez Gali.</h1></div><BookingModes settings={booking} active="floor"/><FloorPlan settings={booking}/></main><SiteFooter content={content}/></>;
}