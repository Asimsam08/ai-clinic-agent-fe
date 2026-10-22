import type { AppointmentRecord, DisplayStatus } from "@/lib/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function dayName(dayOfWeek: number) {
  return DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function formatPrice(price: string | number | null | undefined) {
  if (price === null || price === undefined || price === "") return "Price not set";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "Price not set";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value: string, timeZone?: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatTime(value: string, timeZone?: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function clinicToday(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function displayStatus(appointment: {
  status: AppointmentRecord["status"];
  confirmationExpiresAt: string | null;
  statusHistory?: { reason: string | null }[];
}): DisplayStatus {
  const reason = appointment.statusHistory?.[0]?.reason;

  if (appointment.status === "CANCELLED" && reason === "CONFIRMATION_EXPIRED") {
    return "EXPIRED";
  }

  if (
    appointment.status === "PENDING" &&
    appointment.confirmationExpiresAt &&
    new Date(appointment.confirmationExpiresAt).getTime() <= Date.now()
  ) {
    return "EXPIRED";
  }

  return appointment.status;
}

export function statusLabel(status: DisplayStatus) {
  if (status === "NO_SHOW") return "No-show";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function fieldError(
  errors: { field: string; message: string }[],
  field: string,
) {
  return errors.find((error) => error.field === field)?.message;
}
