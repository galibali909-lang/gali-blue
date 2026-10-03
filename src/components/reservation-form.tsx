"use client";

import { useEffect, useState } from "react";
import { SiteLink as Link } from "./site-navigation";
import { ArrowLeft, ArrowRight, Armchair, Crown, Check, CheckCircle2, CreditCard, LoaderCircle, Phone, ShieldCheck, Utensils } from "lucide-react";
import type { PublicData } from "@/lib/public-data";
import { calculatePrice, dateLabel, money } from "@/lib/domain";
import { GuestSelect } from "./guest-select";
import { BookingDatePicker } from "./booking-date-picker";
import type { SiteContent } from "@/lib/content";
import { BrandMark } from "./brand-mark";

type InitialSelection = { tableId: string; tableName: string; date: string; time: string; guests: number; vip: boolean };
export function ReservationForm({ settings, terms, content, initial }: { settings: PublicData["booking"]; terms: string; content: SiteContent; initial?: InitialSelection }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(initial?.date || settings.tomorrow);
  const [guests, setGuests] = useState(initial?.guests || Math.min(2, settings.maxGuests));
  const [vip, setVip] = useState(initial?.vip || false);
  const [time, setTime] = useState(initial?.time || "");
  const [method, setMethod] = useState("ON_SITE");
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [requestKey] = useState(() => typeof window !== "undefined" ? crypto.randomUUID() : "");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/availability?date=${date}&guests=${guests}&vip=${vip ? "1" : "0"}${initial ? `&tableId=${encodeURIComponent(initial.tableId)}` : ""}`, { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSlots(result.slots); setLoading(false);
      setTime(current => result.slots.some((slot: { time: string; available: boolean }) => slot.time === current && slot.available) ? current : "");
    }).catch(error => { if (error.name !== "AbortError") { setError("Impossible de charger les disponibilites."); setLoading(false); setSlots([]); setTime(""); } });
    return () => controller.abort();
  }, [date, guests, vip, initial]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (step === 1) { if (loading || !slots.some(slot => slot.time === time && slot.available)) return setError("Choisissez un horaire disponible."); setStep(2); return; }
    setBusy(true);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, date, time, guests, vip, method, tableId: initial?.tableId, requestKey: requestKey || crypto.randomUUID(), consent: fields.consent === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReference(result.reference);
    } catch (error) { setError(error instanceof Error ? error.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }
  if (reference) return <div className="booking-success"><CheckCircle2 size={44}/><p className="eyebrow">DEMANDE ENREGISTREE</p><h2>A tres bientot.</h2><p>Notre equipe vous appellera pour valider votre table. Votre demande est en attente d&apos;appel.</p><div className="booking-reference">{reference}</div><p>{dateLabel(`${date}T12:00:00`, "dd/MM/yyyy")} · {time} · {guests} personnes</p><p className="muted">Paiement au restaurant. Aucune somme n&apos;a ete prelevee.</p><Link className="button blue" href="/">Retour a l&apos;accueil <ArrowRight size={16}/></Link></div>;
  const price = calculatePrice(settings.onlineAmount * guests, method, settings.discountEnabled, settings.discountPercent);
  return <div className="reservation-layout"><form onSubmit={submit} className="reservation-form">
    {initial && <p className="booking-table-selection"><Utensils size={18}/> Table souhaitee : <strong>{initial.tableName}</strong> · <Link href="/salle">Changer de table</Link></p>}
    {initial || step === 2 ? <p className="booking-category">{vip ? <Crown size={18}/> : <Armchair size={18}/>} Table {vip ? "VIP" : "standard"}</p> : <fieldset className="booking-category-options"><legend>Categorie de table</legend><div className="booking-category-segments">{[false, true].map(choice => <label className={vip === choice ? "selected" : ""} key={String(choice)}><input type="radio" name="seatingChoice" checked={vip === choice} onChange={() => { setVip(choice); setTime(""); setLoading(true); setError(""); }}/>{choice ? <Crown size={18}/> : <Armchair size={18}/>} {choice ? "VIP" : "Standard"}</label>)}</div></fieldset>}
    <div className="booking-steps"><span className={step === 1 ? "active" : "done"}><b>{step > 1 ? <Check size={15}/> : "01"}</b> Votre table</span><div/><span className={step === 2 ? "active" : ""}><b>02</b> Vos informations</span></div>
    <div hidden={step !== 1}><h2>Une place pour vous.</h2><p className="muted">Choisissez votre moment.</p><div className="form-grid">
      <BookingDatePicker value={date} minimum={settings.today} maximum={settings.lastDate} onChange={next => { setDate(next); setTime(""); setLoading(true); setError(""); }}/>
      <GuestSelect value={guests} maximum={settings.maxGuests} onChange={next => { setGuests(next); setTime(""); setLoading(true); }}/>
    </div><fieldset className="slots"><legend>Votre horaire</legend>{loading ? <div className="loading-inline"><LoaderCircle className="spin" size={18}/> Recherche des disponibilites</div> : slots.map(slot => <button type="button" key={slot.time} disabled={!slot.available} aria-pressed={time === slot.time} className={time === slot.time ? "selected" : ""} onClick={() => { setTime(slot.time); setError(""); }}>{slot.time}{!slot.available && <small>Complet</small>}</button>)}{!loading && !slots.some(slot => slot.available) && <p>Aucun service disponible. Choisissez une autre date.</p>}</fieldset>
    <fieldset className="payment-options"><legend>Mode de paiement</legend><label className={method === "ON_SITE" ? "payment-option selected" : "payment-option"}><input type="radio" name="paymentChoice" checked={method === "ON_SITE"} onChange={() => setMethod("ON_SITE")}/><Utensils size={21}/><span><strong>Au restaurant</strong><small>Reservation validee par telephone</small></span></label>
      {settings.onlineEnabled && <label className={method === "ONLINE" ? "payment-option selected" : "payment-option"}><input type="radio" name="paymentChoice" checked={method === "ONLINE"} onChange={() => setMethod("ONLINE")}/><CreditCard size={21}/><span><strong>En ligne via CMI</strong><small>{settings.discountEnabled ? `${settings.discountPercent} % de reduction sur le paiement en ligne` : "Reservation immediate apres paiement"}</small></span></label>}
    </fieldset></div>
    <div hidden={step !== 2}><h2>Faisons connaissance.</h2><p className="muted">Notre equipe vous contactera sur ce numero.</p><div className="form-grid"><label className="full">Nom complet<input name="name" autoComplete="name" required={step === 2} minLength={2} maxLength={100}/></label><label>Telephone<input name="phone" type="tel" autoComplete="tel" placeholder="+212" required={step === 2}/></label><label>Email <small>(facultatif)</small><input name="email" type="email" autoComplete="email"/></label><label className="full">Une attention particuliere ?<textarea name="note" rows={3} maxLength={1000} placeholder="Occasion, preference de placement..."/></label></div>
    <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
    <label className="checkbox-label"><input type="checkbox" name="consent" required={step === 2}/>J&apos;accepte les conditions de reservation et le traitement de mes informations pour cette demande.</label><Link className="small-link" href="/informations" target="_blank">Consulter les conditions et la confidentialite</Link></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions">{step === 2 && <button type="button" className="button outline" onClick={() => setStep(1)}><ArrowLeft size={16}/> Retour</button>}<button disabled={busy || (step === 1 && (loading || !time))} className="button blue" type="submit">{busy ? <LoaderCircle className="spin" size={17}/> : step === 1 ? "Continuer" : method === "ON_SITE" ? "Envoyer ma demande" : "Payer via CMI"}<ArrowRight size={17}/></button></div>
  </form><aside className="booking-aside"><span className="eyebrow">VOTRE RENDEZ-VOUS</span><h3 className="brand"><BrandMark content={content}/></h3><p>Restaurant & bar · Casablanca</p><dl><div><dt>Date</dt><dd>{date ? dateLabel(`${date}T12:00:00`, "dd/MM/yyyy") : "A choisir"}</dd></div><div><dt>Horaire</dt><dd>{time || "A choisir"}</dd></div><div><dt>Convives</dt><dd>{guests} personnes</dd></div><div><dt>Paiement</dt><dd>{method === "ON_SITE" ? "Au restaurant" : "En ligne"}</dd></div>{method === "ONLINE" && <><div><dt>Montant initial</dt><dd>{money(price.amount)}</dd></div><div><dt>Reduction</dt><dd>{money(price.discountAmount)}</dd></div><div><dt>Total</dt><dd>{money(price.total)}</dd></div></>}</dl>
    <div className="booking-assurance"><Phone size={19}/><p>{method === "ON_SITE" ? "Un appel pour confirmer votre venue, une table pour profiter." : "Votre table sera reservee apres paiement. Notre equipe vous appellera ensuite."}</p></div><div className="booking-assurance"><ShieldCheck size={19}/><p>{method === "ON_SITE" ? "Aucun paiement en ligne. Vous reglez directement au restaurant." : "Paiement securise sur la page du prestataire."}</p></div><details><summary>Conditions de reservation</summary><p>{terms}</p></details>
  </aside></div>;
}