"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Save } from "lucide-react";
import { BrandMark } from "./brand-mark";
import type { SiteContent } from "@/lib/content";

export function AccountForm({ name, role, required, content }: { name: string; role: string; required: boolean; content: SiteContent }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/dashboard"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Modification impossible."); setBusy(false); }
  }
  return <main className="login-page"><Link href="/dashboard" className="brand" aria-label="Accueil du dashboard"><BrandMark content={content}/></Link><div className="login-panel"><div className="login-icon"><KeyRound size={24}/></div><p className="eyebrow">{required ? "PREMIER ACCES" : "MON COMPTE"}</p><h1>{required ? "Un nouveau mot de passe." : "Votre acces personnel."}</h1><p className="muted">{name} · {role}</p><form onSubmit={submit}>{[{ name: "currentPassword", label: "Mot de passe actuel", minimum: 1 }, { name: "password", label: "Nouveau mot de passe", minimum: 12 }, { name: "confirmPassword", label: "Confirmer le mot de passe", minimum: 12 }].map(field => <label key={field.name}>{field.label}<input name={field.name} type={visible ? "text" : "password"} minLength={field.minimum} maxLength={72} required autoComplete={field.name === "currentPassword" ? "current-password" : "new-password"}/></label>)}<button type="button" className="icon-button" title={visible ? "Masquer les mots de passe" : "Afficher les mots de passe"} aria-label={visible ? "Masquer les mots de passe" : "Afficher les mots de passe"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>{error && <p className="form-error" role="alert">{error}</p>}<button className="button blue" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <Save size={17}/>} Enregistrer le mot de passe</button></form>{!required && <Link href="/dashboard" className="login-back"><ArrowLeft size={14}/> Retour au dashboard</Link>}<button className="button outline small" type="button" onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); router.replace("/connexion"); router.refresh(); }}>Se deconnecter</button></div></main>;
}