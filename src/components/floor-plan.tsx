"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Armchair, ArrowRight, LayoutGrid, LoaderCircle, X } from "lucide-react";
import { SiteLink as Link } from "./site-navigation";
import { BookingDatePicker } from "./booking-date-picker";
import { GuestSelect } from "./guest-select";
import type { PublicData } from "@/lib/public-data";
import { dateLabel } from "@/lib/domain";
import "./floor-plan.css";

type PlanTable = { id: string; name: string; area: string; seats: number; planX: number; planY: number; available: boolean };
type Slot = { time: string; available: boolean; tables: PlanTable[] };

export function BookingModes({ settings, active }: { settings: PublicData["booking"]; active: "classic" | "floor" }) {
  return <nav className="booking-modes" aria-label="Parcours de reservation">
    {settings.classicBookingEnabled && <Link href="/reserver" aria-current={active === "classic" ? "page" : undefined}><Armchair size={18}/> Reservation classique</Link>}
    {settings.floorBookingEnabled && <Link href="/salle" aria-current={active === "floor" ? "page" : undefined}><LayoutGrid size={18}/> Choisir sur le plan</Link>}
  </nav>;
}

export function FloorPlan({ settings }: { settings: PublicData["booking"] }) {
  const [date, setDate] = useState(settings.tomorrow);
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<PlanTable | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/availability?floor=1&date=${date}&guests=${guests}`, { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSlots(result.slots);
      setTime(current => result.slots.some((slot: Slot) => slot.time === current) ? current : (result.slots.find((slot: Slot) => slot.available) || result.slots[0])?.time || "");
      setLoading(false);
    }).catch(error => { if (error.name !== "AbortError") { setError(error.message || "Disponibilites indisponibles."); setLoading(false); setSlots([]); } });
    return () => controller.abort();
  }, [date, guests]);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  const tables = slots.find(slot => slot.time === time)?.tables || [];
  function reset() { setLoading(true); setError(""); setSelected(null); }
  function tableButton(table: PlanTable, onPlan = false) {
    return <button key={table.id} type="button" disabled={loading} className={`${onPlan ? "plan-table" : "plan-table-list-item"} ${table.available ? "available" : "unavailable"}`} style={onPlan ? { left: `${table.planX}%`, top: `${table.planY}%` } : undefined} aria-label={`${table.name}, ${table.seats} places, ${table.available ? "Disponible" : "Pas disponible"}`} title={`${table.name} · ${table.seats} places · ${table.available ? "Disponible" : "Pas disponible"}`} onClick={() => setSelected(table)}><Armchair size={onPlan ? 17 : 20}/><strong>{table.name}</strong>{!onPlan && <span>{table.seats} places · {table.available ? "Disponible" : "Pas disponible"}</span>}</button>;
  }
  return <section className="floor-booking" aria-label="Plan de salle">
    <div className="plan-filters">
      <BookingDatePicker value={date} minimum={settings.today} maximum={settings.lastDate} onChange={next => { reset(); setDate(next); setTime(""); }}/>
      <GuestSelect value={guests} maximum={settings.maxGuests} onChange={next => { reset(); setGuests(next); setTime(""); }}/>
      <label>Service<select aria-label="Service" disabled={loading} value={time} onChange={event => { setTime(event.target.value); setSelected(null); }}>{!time && <option value="">Horaire</option>}{slots.map(slot => <option key={slot.time} value={slot.time}>{slot.time}</option>)}</select></label>
    </div>
    <div className="plan-caption"><span className="eyebrow">VOTRE PLACE, VOTRE MOMENT</span><div className="plan-legend"><span><i className="available"/>Disponible</span><span><i className="unavailable"/>Pas disponible</span></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-scroll" tabIndex={0} aria-label="Plan de salle defilant"><div className="plan-canvas">
      <Image src={settings.floorPlanImage} alt="Plan de salle" fill sizes="(max-width: 800px) 840px, 1200px" priority/>
      {!loading && !error && tables.map(table => tableButton(table, true))}
      {loading && <div className="plan-loading" role="status"><LoaderCircle size={22} className="spin"/> Recherche des disponibilites</div>}
    </div></div>
    {!loading && !error && <div className="plan-table-list">{tables.map(table => tableButton(table))}</div>}
    <dialog ref={dialog} className="plan-dialog" onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} aria-labelledby="plan-dialog-title">
      {selected && <><button type="button" className="icon-button plan-close" title="Fermer" aria-label="Fermer" onClick={() => dialog.current?.close()}><X size={20}/></button><Armchair size={35}/><p className="eyebrow">{selected.area}</p><h2 id="plan-dialog-title">Table {selected.name}</h2><p>{selected.seats} places · {guests} convives</p><p>{dateLabel(`${date}T12:00:00`, "dd/MM/yyyy")} · {time}</p>
        {selected.available ? <><p className="plan-status available">Disponible</p><Link className="button blue" href={`/reserver?${new URLSearchParams({ table: selected.id, date, time, guests: String(guests) })}`}>Reserver cette table <ArrowRight size={17}/></Link><p className="muted">Sous reserve de confirmation par notre equipe.</p></> : <><p className="plan-status unavailable" role="status">Pas disponible</p><p>Cette table est indisponible pour ce service ou ce nombre de personnes.</p><button type="button" className="button outline" onClick={() => dialog.current?.close()}>Fermer <X size={16}/></button></>}
      </>}
    </dialog>
  </section>;
}