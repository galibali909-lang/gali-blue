import moment from "moment-timezone";

export const TIMEZONE = "Africa/Casablanca";
export const bookingLabels: Record<string, string> = {
  CALL_PENDING: "En attente d'appel", PAYMENT_PENDING: "Paiement en cours",
  PROVISIONAL: "Provisoire", RESERVED: "Reservee", ARRIVED: "Client arrive",
  COMPLETED: "Honoree", CANCELLED: "Annulee", EXPIRED: "Expiree", NO_SHOW: "Non honoree",
};
export const paymentLabels: Record<string, string> = {
  ON_SITE_DUE: "A regler sur place", PENDING: "En attente", FAILED: "Echoue",
  PAID: "Paye", REFUND_PENDING: "Remboursement a traiter", REFUNDED: "Rembourse",
};
export const callLabels: Record<string, string> = {
  TO_CALL: "A appeler", NO_ANSWER: "Sans reponse", CONFIRMED: "Confirme par telephone", CANCEL_REQUESTED: "Annulation demandee",
};
export const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur", MANAGER: "Manager", HOST: "Accueil", SERVICE: "Service", CASHIER: "Caisse", EDITOR: "Editeur",
};
export const transitions: Record<string, string[]> = {
  CALL_PENDING: ["PROVISIONAL", "CANCELLED"],
  PAYMENT_PENDING: ["CANCELLED"],
  PROVISIONAL: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  RESERVED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED"],
  COMPLETED: [], CANCELLED: [], EXPIRED: [], NO_SHOW: [],
};
export const occupyingStatuses = ["PROVISIONAL", "RESERVED", "ARRIVED", "COMPLETED"] as const;
export function canTransition(current: string, next: string) {
  return transitions[current]?.includes(next) ?? false;
}
export function calculatePrice(amount: number, method: string, enabled: boolean, percent: number) {
  if (!Number.isInteger(amount) || amount < 0 || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error("Montant ou reduction invalide.");
  }
  const discountPercent = method === "ONLINE" && enabled ? percent : 0;
  const discountAmount = Math.round(amount * discountPercent / 100);
  return { amount, discountPercent, discountAmount, total: amount - discountAmount };
}
export type AvailableTable = { id: string; seats: number; area: string; joinGroup: string | null };
export function allocateTables(tables: AvailableTable[], guests: number): AvailableTable[] | null {
  const singles = tables.filter(table => table.seats >= guests).sort((first, second) => first.seats - second.seats);
  if (singles.length) return [singles[0]];
  const groups = new Map<string, AvailableTable[]>();
  for (const table of tables) {
    if (!table.joinGroup) continue;
    const key = `${table.area}:${table.joinGroup}`;
    groups.set(key, [...(groups.get(key) ?? []), table]);
  }
  let best: AvailableTable[] | null = null;
  for (const group of groups.values()) {
    const combinations = new Map<number, AvailableTable[]>([[0, []]]);
    for (const table of group) {
      for (const [seats, combination] of [...combinations.entries()]) {
        const total = seats + table.seats;
        const candidate = [...combination, table];
        if (!combinations.has(total) || combinations.get(total)!.length > candidate.length) combinations.set(total, candidate);
      }
    }
    const capacity = [...combinations.keys()].filter(total => total >= guests).sort((first, second) => first - second)[0];
    const candidate = combinations.get(capacity);
    if (candidate && (!best || candidate.reduce((total, table) => total + table.seats, 0) < best.reduce((total, table) => total + table.seats, 0))) best = candidate;
  }
  return best;
}
export function localDateTime(date: string, time: string) {
  const result = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", true, TIMEZONE);
  if (!result.isValid() || result.format("YYYY-MM-DD HH:mm") !== `${date} ${time}`) throw new Error("Date ou horaire invalide.");
  return result.toDate();
}
export function money(cents: number) {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(cents / 100)} MAD`;
}
export function dateLabel(value: string | Date, pattern = "dd/MM/yyyy HH:mm") {
  const formats: Record<string, string> = { "dd/MM/yyyy HH:mm": "DD/MM/YYYY HH:mm", "yyyy-MM-dd": "YYYY-MM-DD", "dd/MM/yyyy": "DD/MM/YYYY", "HH:mm": "HH:mm", "dd": "DD", "MM / yyyy": "MM / YYYY" };
  return moment(value).tz(TIMEZONE).format(formats[pattern] || formats["dd/MM/yyyy HH:mm"]);
}