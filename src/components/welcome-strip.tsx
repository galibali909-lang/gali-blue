"use client";

import { useState } from "react";
import { Martini, Pause, Play } from "lucide-react";
import "./welcome-strip.css";

export function WelcomeStrip({ phrases }: { phrases: [string, string, string] }) {
  const [paused, setPaused] = useState(false);
  return <section className="welcome-strip animated-welcome" aria-label="Les instants GALI BLUE" data-paused={paused}>
    <div className="welcome-window"><div className="welcome-track">{[0, 1].map(copy => <div className="welcome-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{phrases.map((phrase, index) => <div className="welcome-phrase" key={index}><Martini className="welcome-glass" size={28} strokeWidth={1.5} aria-hidden="true"/><span>{phrase}</span></div>)}</div>)}</div></div>
    <button type="button" className="welcome-play" onClick={() => setPaused(!paused)} title={paused ? "Relancer le bandeau" : "Mettre le bandeau en pause"} aria-label={paused ? "Relancer le bandeau" : "Mettre le bandeau en pause"}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>
  </section>;
}