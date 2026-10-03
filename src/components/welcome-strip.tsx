import { Martini } from "lucide-react";
import "./welcome-strip.css";

export function WelcomeStrip({ phrases }: { phrases: [string, string, string] }) {
  return <section className="welcome-strip animated-welcome" aria-label="Les instants GALI BLUE">
    <div className="welcome-window"><div className="welcome-track">{[0, 1].map(copy => <div className="welcome-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{phrases.map((phrase, index) => <div className="welcome-phrase" key={index}><Martini className="welcome-glass" size={28} strokeWidth={1.5} aria-hidden="true"/><span>{phrase}</span></div>)}</div>)}</div></div>
  </section>;
}