import { publicData } from "@/lib/public-data";
import { SiteFooter, SiteNav } from "@/components/public-ui";
import { ReservationForm } from "@/components/reservation-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reserver une table" };
export default async function BookingPage() {
  const { content, booking } = await publicData();
  return <><SiteNav content={content}/><main className="section inner-page"><div className="page-intro compact"><p className="eyebrow">LES BONS MOMENTS COMMENCENT ICI</p><h1>Votre table, chez Gali.</h1></div><ReservationForm settings={booking} terms={content.bookingTerms} content={content}/></main><SiteFooter content={content}/></>;
}