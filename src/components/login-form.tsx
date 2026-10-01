"use client";

import { useState } from "react";
import { SiteLink as Link } from "./site-navigation";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";

export function LoginForm({ setup }: { setup: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget)), setup }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Connexion impossible."); setBusy(false); }
  }
  return <main className="login-page"><Link href="/" className="brand">GALI BLUE<span>ESPACE EQUIPE</span></Link><div className="login-panel"><div className="login-icon"><LockKeyhole size={24}/></div><p className="eyebrow">{setup ? "PREMIERE CONNEXION" : "BON RETOUR CHEZ GALI"}</p><h1>{setup ? "Votre espace commence ici." : "Bienvenue a bord."}</h1><p className="muted">{setup ? "Creez votre compte administrateur local." : "Connectez-vous avec votre compte personnel."}</p><form onSubmit={submit}>{setup && <label>Votre nom<input name="name" required autoComplete="name" minLength={2}/></label>}<label>Email professionnel<input name="email" type="email" autoComplete="username" required/></label><label>Mot de passe<div className="password-field"><input name="password" type={visible ? "text" : "password"} required minLength={setup ? 12 : 1} maxLength={72} autoComplete={setup ? "new-password" : "current-password"}/><button type="button" className="icon-button" onClick={() => setVisible(!visible)} title={visible ? "Masquer" : "Afficher"} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{setup && <small>12 caracteres minimum.</small>}</label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button blue" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : setup ? "Creer mon espace" : "Se connecter"}<ArrowRight size={17}/></button></form><Link href="/" className="login-back"><ArrowLeft size={14}/> Retour au site</Link></div><p className="login-foot">GALI BLUE · Casablanca</p></main>;
}