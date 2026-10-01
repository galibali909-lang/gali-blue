import { Heart } from "lucide-react";
import "./developer-credit.css";

export function DeveloperCredit() {
  return <span className="developer-credit">D&eacute;velopp&eacute; par <strong>Gripo</strong><Heart size={13} fill="currentColor" aria-hidden="true"/></span>;
}