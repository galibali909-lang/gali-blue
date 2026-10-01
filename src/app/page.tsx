import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { publicData } from "@/lib/public-data";
import { currentStaff } from "@/lib/auth";
import { dateLabel } from "@/lib/domain";
import { Gallery, Hero, MenuCollection, Reveal, SiteFooter, SiteNav } from "@/components/public-ui";
import { Entrance } from "@/components/entrance";

export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const preview = (await searchParams).preview === "1" && ["ADMIN", "MANAGER", "EDITOR"].includes((await currentStaff())?.role || "");
  const { content, menu, events, gallery } = await publicData(preview);
  return <><Entrance content={content}/><a className="skip-link" href="#main">Aller au contenu</a>{preview && <div className="preview-banner">Apercu du brouillon <Link href="/dashboard?view=content">Retour au dashboard</Link></div>}<SiteNav/><main id="main"><Hero content={content}/>
    <section className="welcome-strip"><span>Une cuisine qui rassemble.</span><Sparkles size={20}/><span>Des cocktails qui inspirent.</span><Sparkles size={20}/><span>Des instants qui restent.</span></section>
    <section id="esprit" className="section story-section"><Reveal className="story-copy"><p className="eyebrow">{content.storyEyebrow}</p><h2>{content.storyTitle}</h2><p>{content.storyText}</p><Link href="/reserver" className="text-link">Prenez place <ArrowUpRight size={20}/></Link><div className="story-signature">A Casablanca, tout simplement.</div></Reveal><Reveal className="story-visual" delay={0.15}><div className="story-image"><Image src={content.storyImage || "/images/interior.jpg"} alt="Une table et une cuisine a partager" fill sizes="(max-width: 800px) 100vw, 50vw"/></div><div className="image-note"><span>LA TABLE. LE BAR. LA VIE.</span><span>01 / GALI BLUE</span></div></Reveal></section>
    <section id="carte" className="section menu-section"><Reveal className="section-heading"><div><p className="eyebrow">A LA CARTE</p><h2>{content.menuTitle}</h2><p>{content.menuText}</p></div><Link href="/la-carte" className="button outline">Toute la carte <ArrowUpRight size={18}/></Link></Reveal><MenuCollection items={menu} preview/></section>
    {events.length > 0 && <section className="events-section section"><Reveal><p className="eyebrow">LES RENDEZ-VOUS</p><h2>{content.eventTitle}</h2></Reveal><div className="events-list">{events.map(event => <Reveal key={event.id}><article className="event-row"><div className="event-date"><strong>{dateLabel(event.date, "dd")}</strong><span>{dateLabel(event.date, "MM / yyyy")}</span></div><div><h3>{event.title}</h3><p>{event.description}</p><small>{dateLabel(event.date, "HH:mm")}</small></div><Link className="icon-button" title="Reserver pour cet evenement" aria-label={`Reserver pour ${event.title}`} href="/reserver"><ArrowUpRight/></Link></article></Reveal>)}</div></section>}
    <section id="instants" className="section gallery-section"><Reveal className="section-heading"><div><p className="eyebrow">LES INSTANTS GALI</p><h2>{content.galleryTitle}</h2></div><span className="gallery-caption">Un lieu a vivre, pas seulement a voir.</span></Reveal><Gallery items={gallery}/></section>
    <section className="reservation-band"><Reveal><p className="eyebrow">LE MEILLEUR MOMENT ? LE VOTRE.</p><h2>On vous garde une place ?</h2><Link className="button white" href="/reserver">Reserver une table <ArrowUpRight size={18}/></Link></Reveal><span className="band-monogram" aria-hidden="true">GB</span></section>
  </main><SiteFooter content={content}/></>;
}
