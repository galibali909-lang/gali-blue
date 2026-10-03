import Image from "next/image";
import { SiteLink as Link } from "@/components/site-navigation";
import { ArrowUpRight, Quote } from "lucide-react";
import { publicData } from "@/lib/public-data";
import { currentStaff } from "@/lib/auth";
import { Gallery, Hero, MenuCollection, Reveal, SiteFooter, SiteNav } from "@/components/public-ui";
import { Entrance } from "@/components/entrance";
import { BarScene } from "@/components/bar-scene";
import { WelcomeStrip } from "@/components/welcome-strip";

export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const staff = (await searchParams).preview === "1" ? await currentStaff() : null;
  const preview = Boolean(staff && !staff.mustChangePassword && ["ADMIN", "MANAGER", "EDITOR"].includes(staff.role));
  const { content, menu, events, gallery } = await publicData(preview);
  return <><Entrance content={content}/><a className="skip-link" href="#main">Aller au contenu</a>{preview && <div className="preview-banner">Apercu du brouillon <Link href="/dashboard?view=content">Retour au dashboard</Link></div>}<SiteNav content={content}/><main id="main"><Hero content={content}/>
    <WelcomeStrip phrases={[content.welcomePhrase1, content.welcomePhrase2, content.welcomePhrase3]}/>
    <BarScene events={events} title={content.eventTitle}/>
    <section id="esprit" className="section story-section chef-section"><Reveal className="story-copy"><p className="eyebrow">{content.storyEyebrow}</p><h2>{content.chefName}</h2><p className="chef-intro">{content.storyTitle}</p><p>{content.storyText}</p><blockquote className="story-signature chef-note"><Quote size={25} strokeWidth={1.25} aria-hidden="true"/><p>{content.storySignature}</p><cite>{content.chefName}</cite></blockquote><Link href="/la-carte" className="text-link">Decouvrir sa carte <ArrowUpRight size={20}/></Link></Reveal><Reveal className="story-visual" delay={0.15}><div className="story-image"><Image src={content.storyImage || "/images/chef-demo.jpg"} alt={content.storyCaption || content.chefName} fill sizes="(max-width: 800px) 100vw, 50vw"/></div><div className="image-note"><span>{content.storyCaption}</span><span>{content.chefName}</span></div></Reveal></section>
    <section id="carte" className="section menu-section"><Reveal className="section-heading"><div><p className="eyebrow">A LA CARTE</p><h2>{content.menuTitle}</h2><p>{content.menuText}</p></div><Link href="/la-carte" className="button outline">Toute la carte <ArrowUpRight size={18}/></Link></Reveal><MenuCollection items={menu} preview/></section>
    <section id="instants" className="section gallery-section"><Reveal className="section-heading"><div><p className="eyebrow">LES INSTANTS GALI</p><h2>{content.galleryTitle}</h2></div><span className="gallery-caption">Un lieu a vivre, pas seulement a voir.</span></Reveal><Gallery items={gallery} coverImage={content.heroImage || "/images/restaurant.jpg"}/></section>
    <section className="reservation-band"><Reveal><p className="eyebrow">LE MEILLEUR MOMENT ? LE VOTRE.</p><h2>On vous garde une place ?</h2><Link className="button white" href="/reserver">Reserver une table <ArrowUpRight size={18}/></Link></Reveal><span className="band-monogram" aria-hidden="true">GB</span></section>
  </main><SiteFooter content={content}/></>;
}
