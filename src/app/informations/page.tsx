import { publicData } from "@/lib/public-data";
import { SiteFooter, SiteNav } from "@/components/public-ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Informations et conditions" };
export default async function InformationPage() {
  const { content } = await publicData();
  return <><SiteNav/><main className="section legal-page"><h1>Informations & conditions</h1><h2>Mentions legales</h2><p>{content.legal}</p><h2>Confidentialite</h2><p>{content.privacy}</p><h2>Reservations</h2><p>{content.bookingTerms}</p></main><SiteFooter content={content}/></>;
}