"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Activity, Armchair, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, Clock3, ExternalLink, FileText, Images, LayoutDashboard, LogOut, Menu, MoreHorizontal, Pencil, PhoneCall, Plus, RefreshCw, Search, Settings2, Users, Utensils, X } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { bookingLabel, bookingLabels, callLabels, dateLabel, localDateTime, occupyingStatuses, paymentLabels, roleLabels } from "@/lib/domain";
import { Badge, FieldsForm, Modal, type FormValues, type Mutate } from "./shared";
import { ReservationDetail } from "./reservation-detail";
import { ContentView, EventsView, MediaView, MenuView, SettingsView, StaffView } from "./editors";
import { BrandMark } from "../brand-mark";
import { DeveloperCredit } from "../developer-credit";
import "../floor-plan.css";

type Booking = DashboardData["reservations"][number];
const links = [
  { id: "overview", title: "Vue d'ensemble", icon: LayoutDashboard, group: "GESTION", roles: ["ADMIN", "MANAGER", "HOST", "SERVICE", "CASHIER"] },
  { id: "reservations", title: "Reservations", icon: CalendarDays, group: "", roles: ["ADMIN", "MANAGER", "HOST", "SERVICE", "CASHIER"] },
  { id: "tables", title: "Salle & tables", icon: Armchair, group: "", roles: ["ADMIN", "MANAGER", "HOST", "SERVICE", "CASHIER"] },
  { id: "staff", title: "Personnel", icon: Users, group: "", roles: ["ADMIN", "MANAGER"] },
  { id: "menu", title: "La carte", icon: Utensils, group: "VOTRE SITE", roles: ["ADMIN", "MANAGER", "EDITOR"] },
  { id: "events", title: "Evenements", icon: CalendarDays, group: "", roles: ["ADMIN", "MANAGER", "EDITOR"] },
  { id: "media", title: "Photos & videos", icon: Images, group: "", roles: ["ADMIN", "MANAGER", "EDITOR"] },
  { id: "content", title: "Contenus du site", icon: FileText, group: "", roles: ["ADMIN", "MANAGER", "EDITOR"] },
  { id: "settings", title: "Parametres", icon: Settings2, group: "ADMINISTRATION", roles: ["ADMIN", "MANAGER"] },
  { id: "activity", title: "Historique", icon: Activity, group: "", roles: ["ADMIN", "MANAGER"] },
];

export function Dashboard({ initial, initialView }: { initial: DashboardData; initialView: string }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const visibleLinks = links.filter(link => link.roles.includes(data.staff.role));
  const activeView = visibleLinks.some(link => link.id === initialView) ? initialView : visibleLinks[0].id;
  const [view, setView] = useState(activeView);
  const [mobile, setMobile] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const trigger = menuTrigger.current;
    const query = window.matchMedia("(max-width: 850px)");
    const closeOnDesktop = () => { if (!query.matches) setMobile(false); };
    const closeButton = sidebar.current?.querySelector<HTMLButtonElement>(".dash-close-menu");
    closeButton?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMobile(false); }
      if (event.key !== "Tab") return;
      const controls = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    query.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", keydown);
    return () => { query.removeEventListener("change", closeOnDesktop); document.removeEventListener("keydown", keydown); trigger?.focus(); };
  }, [mobile]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [newReservation, setNewReservation] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [callFilter, setCallFilter] = useState(false);
  const [methodFilter, setMethodFilter] = useState("");
  const [floorDate, setFloorDate] = useState(dateLabel(new Date(), "yyyy-MM-dd"));
  const [floorTime, setFloorTime] = useState((data.settings.serviceTimes as string[])[0] || "19:00");
  const [tableEditor, setTableEditor] = useState<FormValues | null>(null);
  const today = dateLabel(new Date(), "yyyy-MM-dd");
  const canManage = ["ADMIN", "MANAGER", "HOST"].includes(data.staff.role);
  const canEditTables = ["ADMIN", "MANAGER"].includes(data.staff.role);
  const todays = data.reservations.filter(booking => dateLabel(booking.startsAt, "yyyy-MM-dd") === today && !["CANCELLED", "EXPIRED", "NO_SHOW"].includes(booking.status));
  const calls = data.reservations.filter(booking => ["TO_CALL", "NO_ANSWER"].includes(booking.callStatus) && booking.status === "CALL_PENDING");
  const reservation = data.reservations.find(booking => booking.id === selected);
  const filtered = data.reservations.filter(booking => (!statusFilter || booking.status === statusFilter) && (!dateFilter || dateLabel(booking.startsAt, "yyyy-MM-dd") === dateFilter) && (!methodFilter || booking.method === methodFilter) && (!callFilter || calls.some(call => call.id === booking.id)) && `${booking.name} ${booking.phone} ${booking.reference}`.toLowerCase().includes(deferredQuery.toLowerCase())).sort((first, second) => callFilter ? (first.nextCallAt || first.createdAt).localeCompare(second.nextCallAt || second.createdAt) : first.startsAt.localeCompare(second.startsAt));
  async function refresh() {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const result = await response.json();
    if (response.status === 401) { router.replace("/connexion"); router.refresh(); return; }
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }
  const mutate: Mutate = async (resource, payload) => {
    const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, data: payload }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await refresh(); setToast("Modification enregistree.");
  };
  useEffect(() => {
    const controller = new AbortController();
    async function sync() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/admin", { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) { router.replace("/connexion"); router.refresh(); return; }
        if (response.ok) setData(await response.json());
      } catch {}
    }
    const timer = setInterval(() => { void sync(); }, 30000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [router]);
  function navigate(next: string) { setView(next); setMobile(false); window.history.replaceState(null, "", `/dashboard?view=${next}`); }
  async function refreshButton() { setRefreshing(true); setError(""); try { await refresh(); } catch (error) { setError(error instanceof Error ? error.message : "Actualisation impossible."); } finally { setRefreshing(false); } }
  function reservationTable(bookings: Booking[]) {
    return <div className="table-wrap"><table className="data-table"><thead><tr><th>CLIENT</th><th>DATE / HEURE</th><th>COUVERTS</th><th>TABLES</th><th>RESERVATION</th><th>PAIEMENT</th><th>APPEL</th><th/></tr></thead><tbody>{bookings.map(booking => <tr key={booking.id}><td><div className="customer-cell"><span className="avatar">{booking.name.split(" ").map(word => word[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>{booking.name}</strong><small>{booking.phone}</small></div></div></td><td><strong>{dateLabel(booking.startsAt, "HH:mm")}</strong><small>{dateLabel(booking.startsAt, "dd/MM/yyyy")}</small></td><td>{booking.guests} pers.<small>{booking.vip ? "VIP" : "Standard"}</small></td><td>{booking.tables.map(table => table.name).join(", ") || (booking.requestedTableId ? `${data.tables.find(table => table.id === booking.requestedTableId)?.name || "Table"} souhaitee` : "A affecter")}</td><td><Badge status={booking.status} label={bookingLabel(booking.status, booking.callStatus)}/></td><td><Badge status={booking.paymentStatus} label={paymentLabels[booking.paymentStatus]}/></td><td><span className="muted">{callLabels[booking.callStatus]}</span>{booking.nextCallAt && <small>Rappel : {dateLabel(booking.nextCallAt)}</small>}</td><td><button className="icon-button" title="Ouvrir la reservation" aria-label={`Ouvrir la reservation de ${booking.name}`} onClick={() => setSelected(booking.id)}><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table>{!bookings.length && <div className="empty-state"><CalendarDays size={25}/><p>Aucune reservation pour cette selection.</p></div>}</div>;
  }
  const floorStart = floorDate && floorTime ? localDateTime(floorDate, floorTime).getTime() : 0;
  const floorEnd = floorStart + (data.settings.durationMinutes + data.settings.cleanupMinutes) * 60000;
  const bookingsForTable = (id: string) => data.reservations.filter(booking => booking.tables.some(table => table.id === id) && new Date(booking.startsAt).getTime() < floorEnd && new Date(booking.endsAt).getTime() > floorStart && ([...occupyingStatuses as readonly string[]].includes(booking.status) || (booking.status === "PAYMENT_PENDING" && booking.holdUntil && new Date(booking.holdUntil).getTime() > Date.now())));
  return <div className="dashboard">{mobile && <button className="dash-backdrop" aria-label="Fermer le menu" onClick={() => setMobile(false)}/>}
    <aside ref={sidebar} id="dashboard-navigation" role={mobile ? "dialog" : undefined} aria-modal={mobile || undefined} aria-label="Navigation du dashboard" className={`dash-sidebar ${mobile ? "open" : ""}`}><button className="icon-button dash-close-menu" title="Fermer la navigation" aria-label="Fermer la navigation" onClick={() => setMobile(false)}><X size={19}/></button><Link href={`/dashboard?view=${visibleLinks[0].id}`} className="brand" aria-label="Accueil du dashboard" onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(visibleLinks[0].id); }}><BrandMark content={data.settings.content}/></Link><nav aria-label="Dashboard">{visibleLinks.map(link => <div key={link.id}>{link.group && <p className="sidebar-label">{link.group}</p>}<a href={`/dashboard?view=${link.id}`} className={view === link.id ? "active" : ""} aria-current={view === link.id ? "page" : undefined} onClick={event => { event.preventDefault(); navigate(link.id); }}><link.icon size={17}/>{link.title}{link.id === "reservations" && calls.length > 0 && <span className="nav-count">{calls.length}</span>}</a></div>)}</nav><div className="sidebar-bottom"><Link className="sidebar-site" href="/" target="_blank"><ExternalLink size={15}/> Voir le site <ArrowUpRight size={14}/></Link><div className="staff-profile"><span className="avatar">{data.staff.name.slice(0, 2).toUpperCase()}</span><div><strong>{data.staff.name}</strong><small>{roleLabels[data.staff.role]}</small></div><button className="icon-button" title="Se deconnecter" aria-label="Se deconnecter" onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); router.replace("/connexion"); router.refresh(); }}><LogOut size={16}/></button></div></div></aside>
    <div className="dash-main" inert={mobile}><header className="dash-topbar"><button ref={menuTrigger} className="icon-button dash-mobile-button" aria-label="Ouvrir la navigation" aria-controls="dashboard-navigation" aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Menu size={19}/></button><div className="dash-breadcrumb"><span>Espace de gestion</span><ChevronRight size={12}/><strong>{links.find(link => link.id === view)?.title}</strong></div><div className="topbar-right"><Link href="/compte" className="icon-button" title="Mon compte" aria-label="Mon compte"><Users size={16}/></Link><span className="live-indicator"><i/> MySQL connecte</span><button className="icon-button" title="Actualiser" aria-label="Actualiser les donnees" disabled={refreshing} onClick={() => void refreshButton()}><RefreshCw size={16} className={refreshing ? "spin" : ""}/></button></div></header>
    <main className="dash-content"><div className="dash-heading"><div><h1>{view === "overview" ? `Bonjour, ${data.staff.name.split(" ")[0]}.` : links.find(link => link.id === view)?.title}</h1><p>{view === "overview" ? `Votre service en un coup d'oeil · ${dateLabel(new Date(), "dd/MM/yyyy")}` : view === "reservations" ? "Du premier appel au dernier verre." : view === "tables" ? "Chaque table, chaque place, chaque service." : "GALI BLUE · Gestion du restaurant"}</p></div>{canManage && ["overview", "reservations"].includes(view) && <button className="button blue" onClick={() => setNewReservation(true)}><Plus size={17}/> Nouvelle reservation</button>}{canEditTables && view === "tables" && <button className="button blue" onClick={() => setTableEditor({ name: "", area: "Salle", seats: 2, active: true, joinGroup: "" })}><Plus size={17}/> Ajouter une table</button>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {view === "overview" && <><div className="stats-grid">{[
      { label: "Reservations du jour", value: todays.length, sub: "Tous les services", icon: CalendarDays },
      { label: "Couverts attendus", value: todays.filter(booking => ["PROVISIONAL", "RESERVED", "ARRIVED"].includes(booking.status)).reduce((sum, booking) => sum + booking.guests, 0), sub: "Tables affectees", icon: Utensils },
      { label: "Appels a effectuer", value: calls.length, sub: "Demandes et confirmations", icon: PhoneCall },
      { label: "Capacite de la salle", value: data.tables.filter(table => table.active).reduce((sum, table) => sum + table.seats, 0), sub: `${data.tables.filter(table => table.active).length} tables actives`, icon: Armchair },
    ].map(stat => <article className="stat" key={stat.label}><div className="stat-label"><span>{stat.label}</span><stat.icon size={19}/></div><strong>{stat.value.toString().padStart(2, "0")}</strong><small>{stat.sub}</small></article>)}</div>
    {calls.length > 0 && <div className="notice"><Bell size={17}/><span>{calls.length} demande{calls.length > 1 ? "s" : ""} en attente de suivi telephonique.</span><button className="button small outline" onClick={() => { setCallFilter(true); navigate("reservations"); }}>Voir <ArrowRight size={13}/></button></div>}
    <section className="dashboard-section"><div className="section-toolbar"><h2>Les reservations du jour</h2><a href="/dashboard?view=reservations" onClick={event => { event.preventDefault(); navigate("reservations"); }}>Toutes les reservations <ArrowRight size={14}/></a></div>{reservationTable(todays.sort((first, second) => first.startsAt.localeCompare(second.startsAt)))}</section>
    <div className="dashboard-lower"><section className="dashboard-section"><div className="section-toolbar"><h2>La salle</h2><a href="/dashboard?view=tables" onClick={event => { event.preventDefault(); navigate("tables"); }}>Voir les tables <ArrowRight size={13}/></a></div><div className="mini-table-grid">{data.tables.filter(table => table.active).slice(0, 8).map(table => <button className="mini-table" key={table.id} onClick={() => navigate("tables")}><Armchair size={24}/><strong>{table.name}</strong><small>{table.seats} places · {table.area}</small></button>)}</div></section><section className="dashboard-section"><div className="section-toolbar"><h2>Derniere activite</h2><Clock3 size={15}/></div><div className="activity-list">{data.audits.slice(0, 5).map(audit => <div className="activity-item" key={audit.id}><span className="activity-symbol"><Check size={13}/></span><div><p>{audit.detail}</p><small>{audit.actor} · {dateLabel(audit.createdAt, "HH:mm")}</small></div></div>)}{!data.audits.length && <p className="empty-state">Aucune activite a afficher.</p>}</div></section></div></>}
    {view === "reservations" && <><div className="filters"><div className="search-field"><Search size={15}/><input aria-label="Rechercher une reservation" placeholder="Nom, telephone, reference..." value={query} onChange={event => setQuery(event.target.value)}/></div><input aria-label="Filtrer par date" type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)}/><select aria-label="Filtrer par statut" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tous les statuts</option>{Object.entries(bookingLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Mode de paiement" value={methodFilter} onChange={event => setMethodFilter(event.target.value)}><option value="">Tous les paiements</option><option value="ON_SITE">Au restaurant</option><option value="ONLINE">CMI</option></select><button className={`button small ${callFilter ? "blue" : "outline"}`} onClick={() => setCallFilter(!callFilter)}><PhoneCall size={14}/> A appeler</button>{(dateFilter || statusFilter || query || methodFilter || callFilter) && <button className="icon-button" title="Effacer les filtres" aria-label="Effacer les filtres" onClick={() => { setDateFilter(""); setStatusFilter(""); setQuery(""); setCallFilter(false); setMethodFilter(""); }}><X size={15}/></button>}</div>{reservationTable(filtered)}<p className="muted" style={{ marginTop: 12 }}>{filtered.length} resultat(s) · 500 derniers dossiers maximum</p></>}
    {view === "tables" && <><div className="filters"><input type="date" aria-label="Date du plan de salle" value={floorDate} onChange={event => setFloorDate(event.target.value)}/><select aria-label="Service du plan de salle" value={floorTime} onChange={event => setFloorTime(event.target.value)}>{(data.settings.serviceTimes as string[]).map(time => <option key={time} value={time}>{time}</option>)}</select><span className="badge status-active">Disponible</span><span className="badge status-arrived">Affectee</span></div>{[...new Set(data.tables.map(table => table.area))].map(area => <section className="floor-area" key={area}><h2>{area}<small>{data.tables.filter(table => table.area === area && table.active).reduce((sum, table) => sum + table.seats, 0)} places</small></h2><div className="floor-grid">{data.tables.filter(table => table.area === area).map(table => { const bookings = bookingsForTable(table.id); return <article className={`floor-table ${!table.active ? "inactive" : bookings.length ? "reserved" : ""}`} key={table.id}><div className="floor-table-top"><span>{table.seats} places</span>{table.joinGroup && <span>Groupe {table.joinGroup}</span>}</div><div className="table-drawing"><Armchair size={42}/><strong>{table.name}</strong></div><div className="floor-table-bottom"><Badge status={!table.active ? "inactive" : bookings.length ? "arrived" : "active"} label={!table.active ? "Inactive" : bookings.length ? "Affectee" : "Disponible"}/>{canEditTables && <button className="icon-button" title="Modifier la table" aria-label={`Modifier ${table.name}`} onClick={() => setTableEditor({ ...table })}><Pencil size={13}/></button>}</div>{bookings.map(booking => <button className="table-guest" style={{ background: "transparent" }} key={booking.id} onClick={() => setSelected(booking.id)}>{booking.name} · {dateLabel(booking.startsAt, "HH:mm")}</button>)}</article>; })}</div></section>)}</>}
    {view === "staff" && <StaffView data={data} mutate={mutate}/>}{view === "menu" && <MenuView data={data} mutate={mutate}/>}{view === "events" && <EventsView data={data} mutate={mutate}/>}{view === "media" && <MediaView data={data} mutate={mutate} refresh={refresh}/>}{view === "content" && <ContentView data={data} mutate={mutate}/>}{view === "settings" && <SettingsView data={data} mutate={mutate}/>}
    {view === "activity" && <div className="table-wrap"><table className="data-table"><thead><tr><th>DATE</th><th>MEMBRE</th><th>ACTION</th><th>DETAIL</th></tr></thead><tbody>{data.audits.map(audit => <tr key={audit.id}><td>{dateLabel(audit.createdAt)}</td><td>{audit.actor}</td><td><Badge status="neutral" label={audit.action}/></td><td style={{ whiteSpace: "normal", minWidth: 250 }}>{audit.detail}</td></tr>)}</tbody></table></div>}
    </main><footer className="dash-footer"><DeveloperCredit/></footer></div>
    {reservation && <ReservationDetail key={`${reservation.id}:${reservation.updatedAt}`} reservation={reservation} data={data} mutate={mutate} onClose={() => setSelected(null)}/>}
    {tableEditor && <Modal title={tableEditor.id ? "Modifier la table" : "Ajouter une table"} onClose={() => setTableEditor(null)}><FieldsForm initial={tableEditor} fields={[{ name: "name", label: "Numero / nom", required: true }, { name: "area", label: "Espace", required: true }, { name: "seats", label: "Nombre de places", type: "number", min: 1, max: 40, required: true }, { name: "joinGroup", label: "Groupe de tables reunissables", hint: "Meme groupe et meme espace uniquement." }, { name: "planX", label: "Position horizontale (%)", type: "number", min: 0, max: 100, step: .1 }, { name: "planY", label: "Position verticale (%)", type: "number", min: 0, max: 100, step: .1 }, { name: "vip", label: "Table VIP", type: "checkbox", full: true }, { name: "active", label: "Table active", type: "checkbox", full: true }]} onSave={async values => { await mutate("table", values); setTableEditor(null); }}>{(values, update) => <button type="button" className="plan-editor" aria-label="Positionner la table sur le plan" title="Positionner la table" onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); if (event.detail) update({ planX: Math.round((event.clientX - bounds.left) / bounds.width * 1000) / 10, planY: Math.round((event.clientY - bounds.top) / bounds.height * 1000) / 10 }); }}><Image src={data.settings.floorPlanImage || "/images/floor-plan-demo.jpg"} alt="Plan de salle" width={1600} height={1131}/>{values.planX != null && values.planY != null && <span style={{ left: `${values.planX}%`, top: `${values.planY}%` }}>{values.name}{values.vip ? " VIP" : ""}</span>}</button>}</FieldsForm></Modal>}
    {newReservation && <Modal title="Nouvelle reservation" onClose={() => setNewReservation(false)}><FieldsForm initial={{ name: "", phone: "", email: "", date: today, time: (data.settings.serviceTimes as string[])[0], guests: 2, vip: false, note: "" }} fields={[{ name: "name", label: "Nom du client", required: true }, { name: "phone", label: "Telephone", required: true }, { name: "email", label: "Email", type: "email" }, { name: "guests", label: "Personnes", type: "number", min: 1, max: data.settings.maxGuests, required: true }, { name: "date", label: "Date", type: "date", required: true }, { name: "time", label: "Service", type: "select", options: (data.settings.serviceTimes as string[]).map(time => ({ value: time, label: time })) }, { name: "vip", label: "Table VIP", type: "checkbox", full: true }, { name: "note", label: "Note", type: "textarea", full: true }]} submitLabel="Creer la demande" onSave={async values => { await mutate("newReservation", { ...values, method: "ON_SITE", consent: true, requestKey: crypto.randomUUID() }); setNewReservation(false); setToast("Demande creee. Ouvrez-la pour confirmer par telephone et affecter les tables."); }}/></Modal>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}<button aria-label="Fermer la notification" onClick={() => setToast("")}><X size={15}/></button></div>}
  </div>;
}