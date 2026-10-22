export type ClinicRole = "OWNER" | "ADMIN" | "STAFF";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type DisplayStatus = AppointmentStatus | "EXPIRED";

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface AuthPayload {
  token: string;
  user: { id: string; name: string; email: string };
  clinic: { id: string; name: string; slug: string };
  role: ClinicRole;
}

export interface CurrentUser {
  user: { id: string; name: string; email: string; status: string };
  clinic: { id: string; name: string; slug: string };
  role: ClinicRole;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicService {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string | number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  clinicId: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkingHour {
  id: string;
  clinicId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface PublicClinic {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  timezone: string;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
}

export interface PublicStaff {
  id: string;
  name: string;
  title: string | null;
}

export interface PublicClinicProfile {
  clinic: PublicClinic;
  services: PublicService[];
  staff: PublicStaff[];
  workingHours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  reason: string | null;
  createdAt: string;
}

export interface AppointmentRecord {
  id: string;
  clinicId: string;
  contactId: string;
  staffId: string | null;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  confirmationExpiresAt: string | null;
  notes: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  contact: { id: string; name: string | null; phone: string };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number | null;
  };
  staff: { id: string; name: string; title: string | null } | null;
  statusHistory: StatusHistoryEntry[];
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  availableStaff: { id: string; name: string; title: string | null }[];
}

export interface AvailabilityResult {
  date: string;
  timezone?: string;
  service: { id: string; name: string; durationMinutes: number };
  slots: AvailabilitySlot[];
}

export interface ChatMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: string;
  content: string | null;
  createdAt: string;
}

export interface SimulatorThread {
  clinic: {
    id: string;
    name: string;
    timezone: string;
    phone: string | null;
    address: string | null;
  } | null;
  contact: { name: string | null; phone: string } | null;
  conversation: {
    id: string;
    status: string;
    lastMessageAt: string | null;
  } | null;
  messages: ChatMessage[];
  appointments: AppointmentRecord[];
}

export interface ContactRecord {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
}
