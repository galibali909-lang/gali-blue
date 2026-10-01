import { publicData } from "@/lib/public-data";
import { MenuCollection, SiteFooter, SiteNav } from "@/components/public-ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "La carte" };
export default async function MenuPage() {
  const { content, menu } = await publicData();
  return <><SiteNav content={content}/><main className="section inner-page"><div className="page-intro"><p className="eyebrow">DE LA PREMIERE BOUCHEE AU DERNIER VERRE</p><h1>La carte.</h1><p>{content.menuText}</p></div><MenuCollection items={menu}/></main><SiteFooter content={content}/></>;
}