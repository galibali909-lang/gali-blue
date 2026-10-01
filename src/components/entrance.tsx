"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import "./entrance.css";

export function Entrance({ content }: { content: SiteContent }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const finishEntry = useRef<() => void>(() => {});

  function enter() {
    finishEntry.current();
  }

  useEffect(() => {
    const element = dialog.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element) return;
    if (preference.matches) { element.close(); return; }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      element.close();
      delete element.dataset.ready;
    };
    finishEntry.current = finish;
    element.removeAttribute("open");
    element.showModal();
    element.dataset.ready = "true";
    const timeout = window.setTimeout(finish, 3800);
    const onPreferenceChange = () => { if (preference.matches) finish(); };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      window.clearTimeout(timeout);
      preference.removeEventListener("change", onPreferenceChange);
      finish();
    };
  }, []);

  return <><noscript><style>{`.entry-dialog { display: none !important; } body:has(.entry-dialog[open]) { overflow: auto; }`}</style></noscript><dialog ref={dialog} open className="entry-dialog" aria-label="Bienvenue chez GALI BLUE" onCancel={enter} onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === "entry-curtain") enter(); }}>
    <div className="entry-photograph"><Image src={content.heroImage || "/images/restaurant.jpg"} alt="" fill preload sizes="100vw"/></div>
    <div className="entry-tint"/>
    <div className="entry-top"><span>{content.tagline}</span><button onClick={enter} className="entry-skip">Passer <ArrowUpRight size={17}/></button></div>
    <div className="entry-center"><span className="entry-welcome">Bienvenue chez</span><div className="entry-wordmark" aria-label={content.heroTitle}>{content.heroTitle.split(" ").map((word, index) => <span className="entry-word" key={`${word}-${index}`} aria-hidden="true"><span style={{ animationDelay: `${0.15 + index * 0.16}s` }}>{word}</span></span>)}</div><p>{content.heroSubtitle}</p></div>
    <div className="entry-bottom"><span>LA TABLE. LE BAR. LA VIE.</span><div className="entry-line" aria-hidden="true"><span/></div><span>CASABLANCA, MAROC</span></div>
  </dialog></>;
}