"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ExternalLink, ImagePlus, Info, Pencil, Plus, Upload, LoaderCircle } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { dateLabel, money, roleLabels } from "@/lib/domain";
import { Badge, FieldsForm, Modal, type Field, type FormValues, type Mutate } from "./shared";

type Props = { data: DashboardData; mutate: Mutate };
const mediaOptions = (data: DashboardData, kind = "image") => [{ value: "", label: "Aucun fichier" }, ...data.media.filter(media => media.kind === kind).map(media => ({ value: media.url, label: media.title }))];
const imageField = (data: DashboardData): Field => ({ name: "image", label: "Image", type: "select", options: mediaOptions(data), full: true });

export function StaffView({ data, mutate }: Props) {
  const [editing, setEditing] = useState<FormValues | null>(null);
  const fields: Field[] = [
    { name: "name", label: "Nom complet", required: true }, { name: "job", label: "Fonction", required: true },
    { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Telephone" },
    { name: "role", label: "Role", type: "select", options: Object.entries(roleLabels).filter(([key]) => data.staff.role === "ADMIN" || key === "SERVICE").map(([value, label]) => ({ value, label })) },
    { name: "shift", label: "Planning / affectation", hint: "Ex. Soir, 18:00-01:00, terrasse" },
    imageField(data),
    ...(data.staff.role === "ADMIN" ? [{ name: "password", label: "Mot de passe du compte", type: "password" as const, full: true, hint: "Facultatif pour une fiche sans acces. 12 caracteres minimum pour creer ou changer un acces." }] : []),
    { name: "active", label: "Membre actif", type: "checkbox", full: true },
  ];
  return <><div className="section-toolbar"><h2>{data.members.length} membres</h2><button className="button blue small" onClick={() => setEditing({ name: "", job: "Service", role: "SERVICE", active: true })}><Plus size={16}/> Ajouter un membre</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>MEMBRE</th><th>FONCTION</th><th>ROLE</th><th>PLANNING</th><th>STATUT</th><th/></tr></thead><tbody>{data.members.map(member => <tr key={member.id}><td><div className="customer-cell"><span className="avatar">{member.image ? <Image src={member.image} alt="" fill sizes="33px"/> : member.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email || "Sans email"}</small></div></div></td><td>{member.job}</td><td>{roleLabels[member.role]}</td><td>{member.shift || "Non renseigne"}</td><td><Badge status={member.active ? "active" : "inactive"} label={member.active ? "Actif" : "Inactif"}/></td><td><button className="icon-button" title="Modifier" aria-label={`Modifier ${member.name}`} onClick={() => setEditing({ ...member })}><Pencil size={15}/></button></td></tr>)}</tbody></table></div>{editing && <Modal title={editing.id ? "Modifier le membre" : "Ajouter un membre"} onClose={() => setEditing(null)}><FieldsForm fields={fields} initial={editing} onSave={async values => { await mutate("staff", values); setEditing(null); }}/></Modal>}</>;
}
export function MenuView({ data, mutate }: Props) {
  const [editing, setEditing] = useState<FormValues | null>(null);
  const fields: Field[] = [
    { name: "name", label: "Nom", required: true }, { name: "category", label: "Categorie", required: true },
    { name: "description", label: "Description", type: "textarea", full: true },
    { name: "priceMad", label: "Prix (MAD)", type: "number", min: 0, step: 0.01, required: true },
    { name: "position", label: "Ordre d'affichage", type: "number", min: 0 },
    imageField(data), { name: "allergens", label: "Allergenes", full: true },
    { name: "available", label: "Visible et disponible", type: "checkbox", full: true },
  ];
  return <><div className="section-toolbar"><h2>{data.menu.length} produits</h2><button className="button blue small" onClick={() => setEditing({ name: "", category: "Les signatures", description: "", priceMad: 0, position: data.menu.length, available: true })}><Plus size={16}/> Ajouter un produit</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>PRODUIT</th><th>CATEGORIE</th><th>PRIX</th><th>VISIBILITE</th><th/></tr></thead><tbody>{data.menu.map(item => <tr key={item.id}><td><div className="customer-cell"><div className="record-image">{item.image && <Image src={item.image} alt="" fill sizes="44px"/>}</div><div><strong>{item.name}</strong><small>{item.allergens || "Allergenes non renseignes"}</small></div></div></td><td>{item.category}</td><td>{money(item.price)}</td><td><Badge status={item.available ? "active" : "inactive"} label={item.available ? "Publie" : "Masque"}/></td><td><button className="icon-button" title="Modifier" aria-label={`Modifier ${item.name}`} onClick={() => setEditing({ ...item, priceMad: item.price / 100 })}><Pencil size={15}/></button></td></tr>)}</tbody></table></div>{editing && <Modal title={editing.id ? "Modifier le produit" : "Ajouter un produit"} onClose={() => setEditing(null)}><FieldsForm fields={fields} initial={editing} onSave={async values => { await mutate("menu", { ...values, price: Math.round(Number(values.priceMad) * 100) }); setEditing(null); }}/></Modal>}</>;
}
export function EventsView({ data, mutate }: Props) {
  const [editing, setEditing] = useState<FormValues | null>(null);
  const fields: Field[] = [
    { name: "title", label: "Titre", required: true, full: true },
    { name: "date", label: "Date", type: "date", required: true }, { name: "time", label: "Horaire", type: "time", required: true },
    { name: "description", label: "Description", type: "textarea", full: true }, imageField(data),
    { name: "published", label: "Publier sur le site", type: "checkbox", full: true },
  ];
  return <><div className="section-toolbar"><h2>Agenda du restaurant</h2><button className="button blue small" onClick={() => setEditing({ title: "", date: dateLabel(new Date(), "yyyy-MM-dd"), time: "21:30", description: "", published: false })}><Plus size={16}/> Ajouter un evenement</button></div>{data.events.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>EVENEMENT</th><th>DATE</th><th>PUBLICATION</th><th/></tr></thead><tbody>{data.events.map(event => <tr key={event.id}><td><strong>{event.title}</strong></td><td>{dateLabel(event.date)}</td><td><Badge status={event.published ? "active" : "inactive"} label={event.published ? "Publie" : "Brouillon"}/></td><td><button className="icon-button" title="Modifier" aria-label={`Modifier ${event.title}`} onClick={() => setEditing({ ...event, date: dateLabel(event.date, "yyyy-MM-dd"), time: dateLabel(event.date, "HH:mm") })}><Pencil size={15}/></button></td></tr>)}</tbody></table></div> : <p className="empty-state">Aucun evenement pour le moment.</p>}{editing && <Modal title={editing.id ? "Modifier l'evenement" : "Nouvel evenement"} onClose={() => setEditing(null)}><FieldsForm initial={editing} fields={fields} onSave={async values => { await mutate("event", values); setEditing(null); }}/></Modal>}</>;
}
export function MediaView({ data, mutate, refresh }: Props & { refresh: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Televersement impossible."); }
    finally { setBusy(false); }
  }
  return <><div className="section-toolbar media-toolbar"><div><h2>Photos & videos</h2><small>JPEG, PNG, WebP : 8 Mo · MP4 : 30 Mo</small></div><button type="button" className="button blue upload-button" disabled={busy} aria-busy={busy} onClick={() => fileInput.current?.click()}>{busy ? <LoaderCircle className="spin" size={17}/> : <Upload size={17}/>}<span>{busy ? "Import en cours" : "Importer un fichier"}</span></button><input ref={fileInput} type="file" hidden disabled={busy} accept="image/jpeg,image/png,image/webp,video/mp4" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}/></div>{error && <p role="alert" className="form-error">{error}</p>}<div className="media-grid">{data.media.map((media, index) => <article className="media-item" key={media.id}><div className="media-preview">{media.kind === "video" ? <video src={media.url} controls preload="metadata"/> : <Image src={media.url} alt={media.title} fill loading={index < 3 ? "eager" : "lazy"} sizes="(max-width: 380px) 90vw, (max-width: 850px) 44vw, 25vw"/>}</div><div className="media-info"><div><h3>{media.title}</h3><button className="icon-button" title="Modifier le media" aria-label={`Modifier ${media.title}`} onClick={() => setEditing({ ...media })}><Pencil size={14}/></button></div><small>{media.kind === "video" ? "VIDEO" : "PHOTO"} · {media.gallery ? "Dans la galerie" : "Mediatheque"} · Ordre {media.position}</small></div></article>)}</div>{!data.media.length && <p className="empty-state"><ImagePlus/> Aucun media importe.</p>}{editing && <Modal title="Modifier le media" onClose={() => setEditing(null)}><FieldsForm initial={editing} fields={[{ name: "title", label: "Titre / texte alternatif", full: true, required: true }, { name: "position", label: "Ordre dans la galerie", type: "number", min: 0 }, { name: "gallery", label: "Afficher dans la galerie", type: "checkbox", full: true }]} onSave={async values => { await mutate("media", values); setEditing(null); }}/></Modal>}</>;
}
export function SettingsView({ data, mutate }: Props) {
  const settings = data.settings;
  const fields: Field[] = [
    { name: "onlineEnabled", label: "Paiement en ligne via CMI", type: "checkbox", full: true, disabled: !data.cmiReady, hint: data.cmiReady ? "Autoriser les nouvelles transactions sur le site." : "Desactive : integration du contrat marchand CMI requise." },
    { name: "discountEnabled", label: "Reduction sur le paiement en ligne", type: "checkbox", full: true, hint: "Aucune reduction pour les paiements au restaurant." },
    { name: "discountPercent", label: "Reduction (%)", type: "number", min: 0, max: 100 },
    { name: "amountMad", label: "Montant en ligne par personne (MAD)", type: "number", min: 0, step: .01, hint: "Parametre preparatoire. Nature de l'acompte ou formule a valider avant activation." },
    { name: "maxGuests", label: "Personnes maximum par demande", type: "number", min: 1, max: 40 },
    { name: "durationMinutes", label: "Duree d'une reservation (minutes)", type: "number", min: 30, max: 360 },
    { name: "cleanupMinutes", label: "Preparation entre deux tables (minutes)", type: "number", min: 0, max: 120 },
    { name: "holdMinutes", label: "Delai pour payer en ligne (minutes)", type: "number", min: 5, max: 60 },
    { name: "graceMinutes", label: "Tolerance avant absence (minutes)", type: "number", min: 0, max: 120 },
    { name: "times", label: "Horaires des services", hint: "Separer par une virgule : 12:00, 14:30, 19:00, 21:30", full: true, required: true },
    { name: "closures", label: "Dates de fermeture", type: "textarea", full: true, hint: "Une date par ligne, au format AAAA-MM-JJ." },
  ];
  return <div className="settings-layout"><div className="notice warning"><Info size={18}/><span>Le paiement CMI n&apos;est pas raccorde. Aucun paiement reel ou simule ne peut etre encaisse sur cette version locale.</span></div><FieldsForm initial={{ ...Object.fromEntries(Object.entries(settings).filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")), amountMad: settings.onlineAmount / 100, times: (settings.serviceTimes as string[]).join(", "), closures: (settings.closedDates as string[]).join("\n") }} fields={fields} onSave={async values => { await mutate("settings", { ...values, onlineAmount: Math.round(Number(values.amountMad) * 100), serviceTimes: String(values.times).split(",").map(value => value.trim()).filter(Boolean), closedDates: String(values.closures || "").split(/\s+/).filter(Boolean) }); }}/></div>;
}
export function ContentView({ data, mutate }: Props) {
  const [publishError, setPublishError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const fields: Field[] = [
    { name: "brandName", label: "Identite : nom du restaurant", required: true, full: true },
    { name: "brandTagline", label: "Identite : signature du logo", full: true },
    { name: "logoImage", label: "Logo principal", type: "select", options: mediaOptions(data) },
    { name: "logoLightImage", label: "Logo clair (fonds bleus, facultatif)", type: "select", options: mediaOptions(data) },
    { name: "tagline", label: "Accueil : surtitre", full: true }, { name: "heroTitle", label: "Accueil : nom principal", full: true, required: true },
    { name: "heroSubtitle", label: "Accueil : sous-titre", full: true },
    { name: "heroImage", label: "Photo principale", type: "select", options: mediaOptions(data), required: true },
    { name: "heroVideo", label: "Video principale (facultative)", type: "select", options: mediaOptions(data, "video") },
    { name: "storyEyebrow", label: "Le lieu : surtitre", full: true }, { name: "storyTitle", label: "Le lieu : titre", full: true },
    { name: "storyText", label: "Presentation du lieu", type: "textarea", full: true },
    { name: "storyImage", label: "Photo du lieu", type: "select", options: mediaOptions(data), full: true },
    { name: "menuTitle", label: "Carte : titre", full: true }, { name: "menuText", label: "Carte : introduction", type: "textarea", full: true },
    { name: "eventTitle", label: "Evenements : titre", full: true }, { name: "galleryTitle", label: "Galerie : titre", full: true },
    { name: "address", label: "Adresse", full: true }, { name: "hours", label: "Horaires affiches", full: true },
    { name: "phone", label: "Telephone" }, { name: "email", label: "Email de contact", type: "email" }, { name: "instagram", label: "Lien Instagram (https://)", full: true },
    { name: "legal", label: "Mentions legales", type: "textarea", full: true }, { name: "privacy", label: "Politique de confidentialite", type: "textarea", full: true },
    { name: "bookingTerms", label: "Conditions de reservation", type: "textarea", full: true },
  ];
  async function publish() {
    setPublishing(true); setPublishError("");
    try { await mutate("content", { content: data.settings.draftContent || data.settings.content, publish: true }); }
    catch (error) { setPublishError(error instanceof Error ? error.message : "Publication impossible."); }
    finally { setPublishing(false); }
  }
  return <div className="settings-layout"><div className="section-toolbar"><Badge status={data.settings.draftContent ? "call_pending" : "active"} label={data.settings.draftContent ? "Brouillon en attente" : "Contenu publie"}/><div className="inline-controls"><Link className="button small outline" href="/?preview=1" target="_blank"><ExternalLink size={15}/> Apercu</Link><button className="button small blue" disabled={!data.settings.draftContent || publishing} onClick={() => void publish()}><Check size={15}/> Publier le brouillon</button></div></div><div className="notice"><Info size={17}/><span>Enregistrez vos modifications en brouillon, consultez l&apos;apercu puis publiez. Les visiteurs voient uniquement la version publiee.</span></div>{publishError && <p className="form-error">{publishError}</p>}<FieldsForm initial={{ ...(data.settings.draftContent || data.settings.content) }} fields={fields} submitLabel="Enregistrer le brouillon" onSave={async values => { await mutate("content", { content: values, publish: false }); }}/></div>;
}