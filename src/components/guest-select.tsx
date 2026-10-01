"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Users } from "lucide-react";

export function GuestSelect({ value, maximum, onChange }: { value: number; maximum: number; onChange: (value: number) => void }) {
  return <div className="guest-field"><span id="guests-label">Nombre de personnes</span><Select.Root value={String(value)} onValueChange={next => onChange(Number(next))}>
    <Select.Trigger className="guest-trigger" aria-labelledby="guests-label"><Users size={18}/><Select.Value/><Select.Icon><ChevronDown size={17}/></Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content className="guest-dropdown" position="popper" sideOffset={8} collisionPadding={16}>
      <Select.ScrollUpButton className="guest-scroll"><ChevronUp size={16}/></Select.ScrollUpButton>
      <Select.Viewport><Select.Group><Select.Label className="guest-group-label">À votre table</Select.Label>{Array.from({ length: maximum }, (_, index) => <Select.Item className="guest-option" value={String(index + 1)} key={index + 1}><Select.ItemText>{index + 1} {index === 0 ? "personne" : "personnes"}</Select.ItemText><Select.ItemIndicator><Check size={16}/></Select.ItemIndicator></Select.Item>)}</Select.Group></Select.Viewport>
      <Select.ScrollDownButton className="guest-scroll"><ChevronDown size={16}/></Select.ScrollDownButton>
    </Select.Content></Select.Portal>
  </Select.Root></div>;
}