"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useInView, useReducedMotion } from "motion/react";
import { ArrowUpRight, CalendarDays, Pause, Play, X } from "lucide-react";
import type { PublicData } from "@/lib/public-data";
import { dateLabel } from "@/lib/domain";
import { SiteLink } from "./site-navigation";
import "./bar-scene.css";

export function BarScene({ events, title }: { events: PublicData["events"]; title: string }) {
  const section = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(section, { amount: 0.35 });
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const playing = inView && !paused && !hovered && !focused && !reduced && visible;
  const selected = events[active] ? active : 0;
  const event = events[selected];

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!playing || events.length < 2) return;
    const timer = window.setTimeout(() => setActive(current => (current + 1) % events.length), 6500);
    return () => window.clearTimeout(timer);
  }, [playing, active, events.length]);

  function choose(index: number) {
    setActive(index);
    setPaused(true);
  }

  if (!event) return null;
  return <section ref={section} id="bar" className="bar-scene" aria-labelledby="bar-title" data-playing={playing} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="bar-photograph" key={event.id}>
      <Image src={event.image || "/images/restaurant.jpg"} alt={event.title} fill sizes="100vw" loading="eager"/>
      <div className="bar-curtain" aria-hidden="true"/>
    </div>
    <div className="bar-shade" aria-hidden="true"/>
    <header className="bar-topline"><span><CalendarDays size={18}/> LES EVENEMENTS GALI BLUE</span><span className="bar-edition">CASABLANCA, APR&Egrave;S LE JOUR</span></header>
    <div className="bar-composition">
      <div className="bar-heading"><span className="bar-overline">Le rendez-vous</span><h2 id="bar-title" data-long={title.length > 30}>{title.split("\n").map((line, index) => index === 0 ? <span key={index}>{line}</span> : <em key={index}>{line}</em>)}</h2></div>
      <div className="bar-moment" role={events.length > 1 ? "tabpanel" : undefined} id="bar-panel" aria-labelledby={events.length > 1 ? `bar-tab-${event.id}` : "bar-event-title"} aria-live={paused ? "polite" : "off"} data-event-id={event.id}>
        <div className="bar-moment-copy" key={event.id}><span className="bar-number" aria-hidden="true">0{selected + 1}<span>/ 0{events.length}</span></span><time className="bar-event-date" dateTime={event.date}>{dateLabel(event.date)}</time><h3 id="bar-event-title">{event.title}</h3><p>{event.description}</p><div className="bar-event-actions"><SiteLink href="/reserver" className="bar-link">Reserver une table<ArrowUpRight size={19}/></SiteLink><button type="button" className="bar-details" onClick={() => { setPaused(true); dialog.current?.showModal(); }} aria-haspopup="dialog">Voir l&apos;evenement<ArrowUpRight size={16}/></button></div></div>
      </div>
    </div>
    <div className="bar-controls">{events.length > 1 ? <div className="bar-tabs" role="tablist" aria-label="Evenements a venir">{events.map((item, index) => <button ref={element => { tabs.current[index] = element; }} key={item.id} id={`bar-tab-${item.id}`} role="tab" aria-controls="bar-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} title={item.title} onClick={() => choose(index)} onKeyDown={event => {
      const next = event.key === "ArrowRight" ? (index + 1) % events.length : event.key === "ArrowLeft" ? (index + events.length - 1) % events.length : event.key === "Home" ? 0 : event.key === "End" ? events.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); choose(next); tabs.current[next]?.focus();
    }}><span className="bar-tab-number">0{index + 1}</span><span className="bar-tab-title">{item.title}</span><span className="bar-tab-track" aria-hidden="true">{selected === index && <span key={`${selected}-${playing}`} className={playing ? "running" : ""}/>}</span></button>)}</div> : <div className="bar-single"/>}<button className="bar-play" title={paused ? "Relancer l'animation" : "Mettre l'animation en pause"} aria-label={paused ? "Relancer l'animation" : "Mettre l'animation en pause"} onClick={() => setPaused(!paused)}>{paused ? <Play size={17}/> : <Pause size={17}/>}</button></div>
    <dialog ref={dialog} className="bar-event-dialog" aria-labelledby="bar-dialog-title" onClick={click => { if (click.target === click.currentTarget) dialog.current?.close(); }}>
      <div className="bar-dialog-header"><p className="eyebrow">LE RENDEZ-VOUS</p><button type="button" className="icon-button" title="Fermer" aria-label="Fermer l'evenement" onClick={() => dialog.current?.close()}><X size={20}/></button></div>
      <h2 id="bar-dialog-title">{event.title}</h2><time dateTime={event.date}>{dateLabel(event.date)}</time><p className="bar-dialog-description">{event.description}</p><SiteLink href="/reserver" className="button blue" onClick={() => dialog.current?.close()}>Reserver une table <ArrowUpRight size={18}/></SiteLink>
    </dialog>
  </section>;
}