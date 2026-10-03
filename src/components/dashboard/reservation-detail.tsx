"use client";

import { useState } from "react";
import { Check, Phone, PhoneCall, Crown, Save, UserCheck, XCircle, LogOut, CreditCard, MessageSquare } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { bookingLabel, callLabels, dateLabel, localDateTime, money, paymentLabels, transitions } from "@/lib/domain";
import { Badge, type Mutate, Modal } from "./shared";

type Booking = DashboardData["reservations"][number];
export function ReservationDetail({ reservation, data, mutate, onClose }: { reservation: Booking; data: DashboardData; mutate: Mutate; onClose: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [staffId, setStaffId] = useState(reservation.assignedStaffId || "");
  const [tableIds, setTableIds] = useState(reservation.tables.map(table => table.id));
  const [paidAmount, setPaidAmount] = useState("");
  const [callback, setCallback] = useState(() => { const next = reservation.nextCallAt || new Date(Date.now() + 30 * 60000); return `${dateLabel(next, "yyyy-MM-dd")}T${dateLabel(next, "HH:mm")}`; });
  const canManage = ["ADMIN", "MANAGER", "HOST"].includes(data.staff.role);
  const canCollect = ["ADMIN", "MANAGER", "CASHIER"].includes(data.staff.role);
  async function action(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try { await mutate("reservation", { id: reservation.id, note, ...payload }); setNote(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Action impossible."); }
    finally { setBusy(false); }
  }
  const actionLabels: Record<string, string> = { RESERVED: "Confirmer par telephone", ARRIVED: "Enregistrer l'arrivee", COMPLETED: "Enregistrer le depart", CANCELLED: "Annuler", NO_SHOW: "Signaler l'absence" };
  return <Modal title={reservation.reference} onClose={onClose} wide><div className="reservation-detail"><div className="detail-title"><div><h3>{reservation.name}</h3><p>{dateLabel(reservation.startsAt)} · {reservation.guests} personnes</p></div><Badge status={reservation.status} label={bookingLabel(reservation.status, reservation.callStatus)}/></div><div className="detail-grid"><div><span>Telephone</span><a href={`tel:${reservation.phone}`}><Phone size={14}/>{reservation.phone}</a></div><div><span>Email</span><strong>{reservation.email || "Non renseigne"}</strong></div><div><span>Paiement</span><Badge status={reservation.paymentStatus} label={paymentLabels[reservation.paymentStatus]}/></div><div><span>Suivi telephonique</span><strong>{callLabels[reservation.callStatus]}</strong></div><div><span>Tables</span><strong>{reservation.tables.map(table => table.name).join(", ") || "A affecter"}</strong></div><div><span>Personnel affecte</span><strong>{reservation.assignedStaff?.name || "Non affecte"}</strong></div></div>
    <p className="booking-category">{reservation.vip && <Crown size={17}/>} Categorie : <strong>{reservation.vip ? "VIP" : "Standard"}</strong></p>
    <div className="call-summary"><span>{reservation.callAttempts} tentative(s)</span>{reservation.lastCalledAt && <span>Dernier appel : {dateLabel(reservation.lastCalledAt)}</span>}{reservation.nextCallAt && <strong>Prochain rappel : {dateLabel(reservation.nextCallAt)}</strong>}</div>
    {reservation.note && <p className="detail-note">{reservation.note}</p>}
    {reservation.requestedTableId && <p className="detail-note">Table souhaitee : <strong>{data.tables.find(table => table.id === reservation.requestedTableId)?.name || "Table retiree"}</strong></p>}
    {reservation.method === "ONLINE" && <div className="detail-finances"><span>Initial : {money(reservation.amount)}</span><span>Remise : {reservation.discountPercent}%</span><span>Regle : {money(reservation.paidAmount)}</span></div>}
    <div className="detail-actions">{(transitions[reservation.status] || []).filter(status => canManage || (data.staff.role === "SERVICE" && ["ARRIVED", "COMPLETED"].includes(status))).map(status => <button key={status} disabled={busy} className={`button small ${status === "CANCELLED" ? "danger" : status === "NO_SHOW" ? "outline" : "blue"}`} onClick={() => { if (status === "CANCELLED" && !confirm("Annuler cette reservation ? Les tables seront liberees. Un paiement deja recu devra etre traite separement.")) return; void action(status === "RESERVED" ? { action: "call", callStatus: "CONFIRMED" } : { action: "transition", status }); }}>{status === "RESERVED" ? <Check size={15}/> : status === "ARRIVED" ? <UserCheck size={15}/> : status === "COMPLETED" ? <LogOut size={15}/> : <XCircle size={15}/>} {actionLabels[status]}</button>)}</div>
    {canManage && <><section className="detail-section"><h4>Suivi de l&apos;appel</h4><div className="inline-controls"><a className="button outline" href={`tel:${reservation.phone}`}><Phone size={16}/> Appeler</a>{reservation.status === "CALL_PENDING" && <><label>Prochain rappel<input type="datetime-local" aria-label="Prochain rappel" value={callback} onChange={event => setCallback(event.target.value)}/></label><button type="button" className="button outline" disabled={busy || !callback} onClick={() => { try { const [date, time] = callback.split("T"); void action({ action: "call", callStatus: "NO_ANSWER", nextCallAt: localDateTime(date, time).toISOString() }); } catch { setError("Choisissez un rappel valide."); } }}><PhoneCall size={16}/> Sans reponse, rappeler</button></>}</div></section>
    {["PROVISIONAL", "RESERVED"].includes(reservation.status) && <section className="detail-section"><h4>Affectation</h4><div className="table-checkboxes">{data.tables.filter(table => table.active && table.vip === reservation.vip).map(table => <label key={table.id}><input type="checkbox" checked={tableIds.includes(table.id)} onChange={event => setTableIds(event.target.checked ? [...tableIds, table.id] : tableIds.filter(id => id !== table.id))}/>{table.name} · {table.seats} pl.{table.vip ? " · VIP" : ""}</label>)}</div><div className="inline-controls"><select aria-label="Personnel affecte" value={staffId} onChange={event => setStaffId(event.target.value)}><option value="">Non affecte</option>{data.members.filter(member => member.active).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select><button className="button outline" disabled={busy} onClick={() => void action({ action: "assign", staffId: staffId || null, tableIds })}><Save size={16}/> Affecter</button></div></section>}
    <section className="detail-section"><h4>Ajouter une note</h4><textarea aria-label="Note de suivi" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={2}/><button className="button small outline" disabled={busy || !note.trim()} onClick={() => void action({ action: "note" })}><MessageSquare size={15}/> Enregistrer la note</button></section></>}
    {canCollect && reservation.method === "ON_SITE" && reservation.paymentStatus !== "PAID" && ["ARRIVED", "COMPLETED"].includes(reservation.status) && <section className="detail-section"><h4>Encaissement au restaurant</h4><div className="inline-controls"><label>Montant encaisse (MAD)<input type="number" min="0.01" step="0.01" value={paidAmount} onChange={event => setPaidAmount(event.target.value)}/></label><button className="button blue" disabled={busy || Number(paidAmount) <= 0} onClick={() => void action({ action: "collect", paidAmount: Math.round(Number(paidAmount) * 100) })}><CreditCard size={16}/> Enregistrer</button></div><p className="muted">Aucune reduction en ligne ne s&apos;applique au paiement sur place.</p></section>}
    {reservation.paymentStatus === "PAID" && <p className="paid-note"><Check size={16}/> Montant encaisse : {money(reservation.paidAmount)}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="detail-section"><h4>Historique</h4><div className="timeline">{reservation.audits.map(audit => <div key={audit.id}><span className="timeline-dot"/><div><p>{audit.detail}</p><small>{audit.actor} · {dateLabel(audit.createdAt)}</small></div></div>)}</div></section>
  </div></Modal>;
}