"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { SiteContent } from "@/lib/content";
import { useSiteNavigation } from "./site-navigation";
import { BrandMark } from "./brand-mark";
import "./entrance.css";

export function Entrance({ content }: { content: SiteContent }) {
  const { entranceAllowed, entranceVersion, dismissEntrance } = useSiteNavigation();
  return entranceAllowed ? <EntranceDialog key={entranceVersion} content={content} onFinish={dismissEntrance}/> : null;
}

function EntranceDialog({ content, onFinish }: { content: SiteContent; onFinish: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const finishEntry = useRef<() => void>(() => {});
  const onFinishRef = useRef(onFinish);
  useLayoutEffect(() => { onFinishRef.current = onFinish; });

  function enter() {
    finishEntry.current();
  }

  useLayoutEffect(() => {
    const element = dialog.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element) return;
    if (preference.matches || window.location.hash) { element.close(); onFinishRef.current(); return; }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      element.close();
      delete element.dataset.ready;
      onFinishRef.current();
    };
    finishEntry.current = finish;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    element.removeAttribute("open");
    element.showModal();
    element.dataset.ready = "true";
    const timeout = window.setTimeout(finish, 3200);
    const onPreferenceChange = () => { if (preference.matches) finish(); };
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      window.clearTimeout(timeout);
      preference.removeEventListener("change", onPreferenceChange);
      element.close();
      delete element.dataset.ready;
    };
  }, []);

  return <><noscript><style>{`.entry-dialog { display: none !important; } body:has(.entry-dialog[open]) { overflow: auto; }`}</style></noscript><dialog ref={dialog} open className="entry-dialog" aria-label="Bienvenue chez GALI BLUE" onCancel={enter} onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === "entry-curtain") enter(); }}>
    <div className="entry-photograph"><Image src={content.heroImage || "/images/restaurant.jpg"} alt="" fill preload sizes="100vw"/></div>
    <div className="entry-tint"/>
    <div className="entry-top"><span>{content.tagline}</span><button onClick={enter} className="entry-skip">Passer <ArrowUpRight size={17}/></button></div>
    <div className="entry-center"><span className="entry-welcome">Bienvenue chez</span><div className="entry-wordmark" aria-label={content.brandName}>{content.logoLightImage || content.logoImage ? <BrandMark content={content} light/> : content.brandName.split(" ").map((word, index) => <span className="entry-word" key={`${word}-${index}`} aria-hidden="true"><span style={{ animationDelay: `${0.15 + index * 0.16}s` }}>{word}</span></span>)}</div><p>{content.heroSubtitle}</p></div>
    <div className="entry-bottom"><span>LA TABLE. LE BAR. LA VIE.</span><div className="entry-line" aria-hidden="true"><span/></div><span>CASABLANCA, MAROC</span></div>
  </dialog></>;
}