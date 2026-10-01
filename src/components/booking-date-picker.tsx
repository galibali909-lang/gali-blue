"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { format, parseISO } from "date-fns";
import "react-day-picker/style.css";
import "./booking-date-picker.css";

export function BookingDatePicker({ value, minimum, maximum, onChange }: { value: string; minimum: string; maximum: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const firstDate = parseISO(minimum);
  const lastDate = parseISO(maximum);
  return <div className="booking-date-field"><span id="booking-date-label">Date</span><Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger asChild><button type="button" className="booking-date-trigger" aria-labelledby="booking-date-label booking-date-value"><CalendarDays size={18}/><span id="booking-date-value">{format(selected, "d MMMM yyyy", { locale: fr })}</span><ChevronDown size={17}/></button></Popover.Trigger>
    <Popover.Portal><Popover.Content className="booking-date-popover" align="start" sideOffset={8} collisionPadding={16} aria-label="Choisir la date de réservation">
      <DayPicker className="booking-calendar" mode="single" required selected={selected} defaultMonth={selected} onSelect={next => { onChange(format(next, "yyyy-MM-dd")); setOpen(false); }} locale={fr} weekStartsOn={1} startMonth={firstDate} endMonth={lastDate} disabled={[{ before: firstDate }, { after: lastDate }]} showOutsideDays fixedWeeks autoFocus components={{ Chevron: ({ orientation, className }) => orientation === "left" ? <ChevronLeft className={className} size={18}/> : <ChevronRight className={className} size={18}/> }}/>
    </Popover.Content></Popover.Portal>
  </Popover.Root></div>;
}