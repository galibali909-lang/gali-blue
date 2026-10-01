"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";

export type Field = { name: string; label: string; type?: "text" | "number" | "email" | "password" | "date" | "time" | "textarea" | "checkbox" | "select"; options?: { value: string; label: string }[]; required?: boolean; min?: number; max?: number; step?: number; full?: boolean; hint?: string; disabled?: boolean };
export type FormValues = Record<string, string | number | boolean | null | undefined>;
export type Mutate = (resource: string, data: unknown) => Promise<void>;
export function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`admin-modal ${wide ? "wide" : ""}`} onCancel={onClose} onClick={event => { if (event.currentTarget === event.target) onClose(); }} aria-label={title}><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={19}/></button></div>{children}</dialog>;
}
export function FieldsForm({ fields, initial, onSave, submitLabel = "Enregistrer", children }: { fields: Field[]; initial: FormValues; onSave: (values: FormValues) => Promise<void>; submitLabel?: string; children?: React.ReactNode }) {
  const [values, setValues] = useState<FormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(values); } catch (error) { setError(error instanceof Error ? error.message : "Operation impossible."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit}><div className="form-grid admin-fields">{fields.map(field => {
    const value = values[field.name];
    const update = (next: string | number | boolean) => setValues({ ...values, [field.name]: next });
    if (field.type === "checkbox") return <label className={`switch-field ${field.full ? "full" : ""}`} key={field.name}><span><strong>{field.label}</strong>{field.hint && <small>{field.hint}</small>}</span><input type="checkbox" role="switch" disabled={field.disabled} checked={Boolean(value)} onChange={event => update(event.target.checked)}/></label>;
    return <label key={field.name} className={field.full ? "full" : ""}>{field.label}{field.type === "textarea" ? <textarea rows={4} value={String(value ?? "")} onChange={event => update(event.target.value)} required={field.required} maxLength={6000}/> : field.type === "select" ? <select aria-label={field.label} value={String(value ?? "")} onChange={event => update(event.target.value)} required={field.required}>{field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input type={field.type || "text"} value={String(value ?? "")} onChange={event => update(field.type === "number" ? Number(event.target.value) : event.target.value)} required={field.required} min={field.min} max={field.max} step={field.step} disabled={field.disabled} autoComplete={field.type === "password" ? "new-password" : undefined}/>} {field.hint && <small>{field.hint}</small>}</label>;
  })}</div>{children}{error && <p role="alert" className="form-error">{error}</p>}<div className="form-actions"><button className="button blue" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin"/> : <Save size={16}/>} {submitLabel}</button></div></form>;
}
export function Badge({ status, label }: { status: string; label: string }) { return <span className={`badge status-${status.toLowerCase()}`}><i/>{label}</span>; }