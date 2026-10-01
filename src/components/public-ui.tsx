"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Menu, Pause, Play, X, MapPin, Camera } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import type { PublicData } from "@/lib/public-data";
import { money } from "@/lib/domain";

export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -30px 0px" }} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
export function SiteNav() {
  const [open, setOpen] = useState(false);
  return <header className="site-nav"><Link href="/" className="brand" aria-label="GALI BLUE accueil">GALI BLUE<span>CASABLANCA</span></Link>
    <nav aria-label="Navigation principale" className={open ? "nav-links open" : "nav-links"}>
      <DropdownMenu.Root><DropdownMenu.Trigger className="house-trigger">La maison <ChevronDown size={14}/></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="house-dropdown" sideOffset={24} align="start" collisionPadding={16}><DropdownMenu.Label className="house-menu-label">L&apos;UNIVERS GALI BLUE</DropdownMenu.Label>
        {[{ href: "/#esprit", title: "L'esprit Gali", detail: "Une adresse, une personnalité.", number: "01" }, { href: "/#instants", title: "Les instants", detail: "La maison en images.", number: "02" }, { href: "/#contact", title: "Nous trouver", detail: "Rendez-vous à Casablanca.", number: "03" }].map(item => <DropdownMenu.Item asChild key={item.href}><Link href={item.href} onClick={() => setOpen(false)} className="house-menu-item"><span className="house-menu-number">{item.number}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight size={18}/></Link></DropdownMenu.Item>)}
      </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root><Link href="/la-carte" onClick={() => setOpen(false)}>La carte</Link>
      <Link href="/#contact" onClick={() => setOpen(false)}>Nous trouver</Link>
    </nav><Link className="button blue nav-reserve" href="/reserver">Reserver une table <ArrowUpRight size={17}/></Link>
    <button className="icon-button mobile-menu" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
  </header>;
}
export function Hero({ content }: { content: SiteContent }) {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const photographY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!video.current || reduced) return;
    video.current.play().catch(() => {});
  }, [reduced]);
  return <section className="hero" ref={section}>
    <motion.div className="hero-image-layer" style={{ y: reduced ? 0 : photographY }}><Image src={content.heroImage || "/images/restaurant.jpg"} alt="Ambiance du restaurant" fill loading="eager" sizes="100vw" className="hero-photo"/></motion.div>
    {content.heroVideo && <video ref={video} className="hero-video" src={content.heroVideo} poster={content.heroImage} muted loop playsInline onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>}
    <div className="hero-shade"/>
    <div className="hero-topline"><span>{content.tagline}</span><span>UNE ADRESSE. VOTRE INSTANT.</span></div>
    <div className="hero-content"><Reveal><p className="hero-prelude">La vie, en bleu.</p><h1 aria-label={content.heroTitle}>{content.heroTitle.split(" ").map((word, index) => <span key={`${word}-${index}`} className={index % 2 ? "hero-word accent-word" : "hero-word"}>{word}{" "}</span>)}</h1><p className="hero-subtitle">{content.heroSubtitle}</p>
      <div className="hero-actions"><Link className="button white" href="/reserver">Votre table vous attend <ArrowUpRight size={18}/></Link><Link className="hero-menu-link" href="/la-carte">Explorer la carte <ArrowUpRight size={17}/></Link></div>
    </Reveal></div>
    <div className="hero-bottom"><span>CUISINE DE CARACTÈRE<br/><strong>ESPRIT LIBRE.</strong></span><a href="#esprit" className="scroll-link" aria-label="Decouvrir le restaurant"><ArrowDown size={20}/></a><span>CASABLANCA<br/><strong>MAROC</strong></span></div>
    {content.heroVideo && <button className="video-toggle icon-button" title={playing ? "Mettre en pause" : "Lire la video"} aria-label={playing ? "Mettre en pause" : "Lire la video"} onClick={() => playing ? video.current?.pause() : void video.current?.play().catch(() => {})}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>}
  </section>;
}
export function MenuCollection({ items, preview = false }: { items: PublicData["menu"]; preview?: boolean }) {
  const categories = [...new Set(items.map(item => item.category))];
  const [category, setCategory] = useState("Tout");
  const visible = preview ? items.slice(0, 3) : items.filter(item => category === "Tout" || item.category === category);
  return <>
    {!preview && <div className="menu-tabs" role="tablist" aria-label="Categories de la carte">{["Tout", ...categories].map(name => <button key={name} role="tab" aria-selected={category === name} className={name === category ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}</div>}
    <div className={`dish-grid ${preview ? "dish-preview" : ""}`}>{visible.map((item, index) => <Reveal key={item.id} delay={Math.min(index * 0.06, 0.24)}><article className="dish">
      <div className="dish-image"><Image src={item.image || "/images/burrata.jpg"} alt={item.name} fill sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw"/><span>{item.category}</span><span className="dish-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div>
      <div className="dish-heading"><h3>{item.name}</h3><span>{money(item.price)}</span></div><p>{item.description}</p>{item.allergens && <small>Allergenes : {item.allergens}</small>}
    </article></Reveal>)}</div>
    {!visible.length && <p className="empty-state">La carte sera bientot disponible.</p>}
  </>;
}
export function Gallery({ items }: { items: PublicData["gallery"] }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const item = items[selected];
  return <><div className="gallery-grid">{items.slice(0, 4).map((media, index) => <button key={media.id} className="gallery-image" onClick={() => { setSelected(index); dialog.current?.showModal(); }} aria-label={`Ouvrir ${media.title}`}>
    {media.kind === "video" ? <video src={media.url} muted preload="metadata"/> : <Image src={media.url} alt={media.title} fill sizes="(max-width: 650px) 80vw, 33vw"/>}<span>{media.title} <ArrowUpRight size={19}/></span>
  </button>)}</div>
  <dialog ref={dialog} className="lightbox" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} aria-label="Galerie photo et video">
    <button className="icon-button lightbox-close" onClick={() => dialog.current?.close()} aria-label="Fermer la galerie"><X/></button>
    {item && <div className="lightbox-media">{item.kind === "video" ? <video key={item.id} src={item.url} controls/> : <Image src={item.url} alt={item.title} fill sizes="90vw"/>}</div>}
    <div className="lightbox-caption"><button className="icon-button" aria-label="Image precedente" onClick={() => setSelected((selected - 1 + items.length) % items.length)}><ChevronLeft/></button><span>{item?.title}</span><button className="icon-button" aria-label="Image suivante" onClick={() => setSelected((selected + 1) % items.length)}><ChevronRight/></button></div>
  </dialog></>;
}
export function SiteFooter({ content }: { content: SiteContent }) {
  return <footer id="contact" className="site-footer"><div className="footer-top"><div><Link className="footer-brand" href="/">GALI BLUE</Link><p>Restaurant & bar · Casablanca</p></div><div><h3>Venez comme vous etes.</h3><p>{content.address}</p><p>{content.hours}</p></div><div className="footer-links">
    {content.phone && <a href={`tel:${content.phone.replace(/\s/g, "")}`}>{content.phone}</a>}{content.email && <a href={`mailto:${content.email}`}>{content.email}</a>}
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`GALI BLUE ${content.address}`)}`} target="_blank" rel="noreferrer"><MapPin size={16}/> Itineraire <ArrowUpRight size={15}/></a>
    {content.instagram && <a href={content.instagram} target="_blank" rel="noreferrer"><Camera size={16}/> Instagram</a>}
  </div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} GALI BLUE</span><div><Link href="/informations">Confidentialite & conditions</Link></div></div></footer>;
}