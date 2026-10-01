"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useInView, useReducedMotion } from "motion/react";
import { ArrowUpRight, Martini, Pause, Play } from "lucide-react";
import { SiteLink } from "./site-navigation";
import "./bar-scene.css";

const moments = [
  { id: "aperitif", label: "L'ap\u00e9ritif", title: "Le premier verre.", note: "Et le temps qui ralentit.", alt: "Un cocktail servi au bar", action: "La carte du bar", href: "/la-carte" },
  { id: "table", label: "\u00c0 table", title: "Les conversations.", note: "Celles qu'on prolonge autour d'une table.", alt: "Une table dressee dans le restaurant", action: "Prendre une table", href: "/reserver" },
  { id: "soiree", label: "La soir\u00e9e", title: "Encore un instant.", note: "La nuit peut bien attendre.", alt: "La salle et le bar du restaurant", action: "Nous retrouver", href: "/#contact" },
] as const;

export function BarScene({ images }: { images: [string, string, string] }) {
  const section = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(section, { amount: 0.35 });
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const playing = inView && !paused && !hovered && !focused && !reduced && visible;
  const moment = moments[active];

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setActive(current => (current + 1) % moments.length), 6500);
    return () => window.clearTimeout(timer);
  }, [playing, active]);

  function choose(index: number) {
    setActive(index);
    setPaused(true);
  }

  return <section ref={section} id="bar" className="bar-scene" aria-labelledby="bar-title" data-playing={playing} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="bar-photograph" key={moment.id}>
      <Image src={images[active]} alt={moment.alt} fill sizes="100vw" loading="eager"/>
      <div className="bar-curtain" aria-hidden="true"/>
    </div>
    <div className="bar-shade" aria-hidden="true"/>
    <header className="bar-topline"><span><Martini size={18}/> LE BAR & LES BELLES HEURES</span><span className="bar-edition">CASABLANCA, APR&Egrave;S LE JOUR</span></header>
    <div className="bar-composition">
      <div className="bar-heading"><span className="bar-overline">Le rendez-vous</span><h2 id="bar-title">L&apos;heure<br/><em>bleue.</em></h2></div>
      <div className="bar-moment" role="tabpanel" id="bar-panel" aria-labelledby={`bar-tab-${moment.id}`} aria-live={paused ? "polite" : "off"}>
        <div className="bar-moment-copy" key={moment.id}><span className="bar-number" aria-hidden="true">0{active + 1}<span>/ 03</span></span><h3>{moment.title}</h3><p>{moment.note}</p><SiteLink href={moment.href} className="bar-link">{moment.action}<ArrowUpRight size={19}/></SiteLink></div>
      </div>
    </div>
    <div className="bar-controls"><div className="bar-tabs" role="tablist" aria-label="Les instants du bar">{moments.map((item, index) => <button ref={element => { tabs.current[index] = element; }} key={item.id} id={`bar-tab-${item.id}`} role="tab" aria-controls="bar-panel" aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => choose(index)} onKeyDown={event => {
      const next = event.key === "ArrowRight" ? (index + 1) % moments.length : event.key === "ArrowLeft" ? (index + moments.length - 1) % moments.length : event.key === "Home" ? 0 : event.key === "End" ? moments.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); choose(next); tabs.current[next]?.focus();
    }}><span className="bar-tab-number">0{index + 1}</span><span>{item.label}</span><span className="bar-tab-track" aria-hidden="true">{active === index && <span key={`${active}-${playing}`} className={playing ? "running" : ""}/>}</span></button>)}</div><button className="bar-play" title={paused ? "Relancer les ambiances" : "Mettre les ambiances en pause"} aria-label={paused ? "Relancer les ambiances" : "Mettre les ambiances en pause"} onClick={() => setPaused(!paused)}>{paused ? <Play size={17}/> : <Pause size={17}/>}</button></div>
  </section>;
}