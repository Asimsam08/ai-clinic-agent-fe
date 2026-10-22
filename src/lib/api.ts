import type {
  ApiFieldError,
  AppointmentRecord,
  AppointmentStatus,
  AuthPayload,
  AvailabilityResult,
  ChatMessage,
  Clinic,
  ClinicService,
  ContactRecord,
  CurrentUser,
  PublicClinic,
  PublicClinicProfile,
  SimulatorThread,
  StaffMember,
  WorkingHour,
} from "@/lib/types";

const TOKEN_KEY = "clinic_token";

export class ApiError extends Error {
  status: number;
  fieldErrors: ApiFieldError[];

  constructor(message: string, status: number, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(
    /\/$/,
    "",
  );
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the clinic API. Start the backend and check NEXT_PUBLIC_API_URL.",
      0,
    );
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    if (response.status === 401 && options.auth !== false) {
      setToken(null);
    }

    const errors = Array.isArray(payload.errors)
      ? (payload.errors as ApiFieldError[])
      : [];

    throw new ApiError(
      typeof payload.message === "string" ? payload.message : "Request failed",
      response.status,
      errors,
    );
  }

  return payload as T;
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  register(body: {
    name: string;
    email: string;
    password: string;
    clinicName: string;
  }) {
    return request<{ message: string; data: AuthPayload }>("/api/auth/register", {
      method: "POST",
      auth: false,
      body,
    });
  },

  login(body: { email: string; password: string }) {
    return request<{ message: string; data: AuthPayload }>("/api/auth/login", {
      method: "POST",
      auth: false,
      body,
    });
  },

  me() {
    return request<{ message: string; data: CurrentUser }>("/api/auth/me");
  },

  getClinic() {
    return request<{ message: string; data: Clinic }>("/api/clinic");
  },

  updateClinic(body: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
  }) {
    return request<{ message: string; data: Clinic }>("/api/clinic", {
      method: "PATCH",
      body,
    });
  },

  listServices() {
    return request<{ message: string; data: ClinicService[] }>("/api/services");
  },

  createService(body: {
    name: string;
    description?: string;
    durationMinutes: number;
    price?: number;
  }) {
    return request<{ message: string; data: ClinicService }>("/api/services", {
      method: "POST",
      body,
    });
  },

  updateService(
    serviceId: string,
    body: {
      name?: string;
      description?: string | null;
      durationMinutes?: number;
      price?: number | null;
      isActive?: boolean;
    },
  ) {
    return request<{ message: string; data: ClinicService }>(
      `/api/services/${serviceId}`,
      { method: "PATCH", body },
    );
  },

  listStaff() {
    return request<{ message: string; data: StaffMember[] }>("/api/staff");
  },

  createStaff(body: {
    name: string;
    title?: string;
    phone?: string;
    email?: string;
  }) {
    return request<{ message: string; data: StaffMember }>("/api/staff", {
      method: "POST",
      body,
    });
  },

  updateStaff(
    staffId: string,
    body: {
      name?: string;
      title?: string | null;
      phone?: string | null;
      email?: string | null;
      isActive?: boolean;
    },
  ) {
    return request<{ message: string; data: StaffMember }>(`/api/staff/${staffId}`, {
      method: "PATCH",
      body,
    });
  },

  listWorkingHours() {
    return request<{ message: string; data: WorkingHour[] }>("/api/working-hours");
  },

  saveWorkingHours(days: {
    dayOfWeek: number;
    openTime?: string;
    closeTime?: string;
    isClosed: boolean;
  }[]) {
    return request<{ message: string; data: WorkingHour[] }>("/api/working-hours", {
      method: "PUT",
      body: { days },
    });
  },

  listAppointments(filters: {
    status?: AppointmentStatus;
    from?: string;
    to?: string;
  }) {
    return request<{ message: string; data: AppointmentRecord[] }>(
      `/api/appointments${query(filters)}`,
    );
  },

  availability(filters: { date: string; serviceId: string; staffId?: string }) {
    return request<{ message: string; data: AvailabilityResult }>(
      `/api/appointments/availability${query(filters)}`,
    );
  },

  createContact(body: {
    name?: string;
    phone: string;
    email?: string;
    whatsappOptIn?: boolean;
  }) {
    return request<{ message: string; data: ContactRecord }>("/api/contacts", {
      method: "POST",
      body,
    });
  },

  createAppointment(body: {
    contactId: string;
    serviceId: string;
    staffId: string;
    startAt: string;
    notes?: string;
  }) {
    return request<{ message: string; data: { id: string; status: AppointmentStatus } }>(
      "/api/appointments",
      { method: "POST", body },
    );
  },

  updateAppointmentStatus(
    appointmentId: string,
    body: { status: Exclude<AppointmentStatus, "PENDING">; reason?: string },
  ) {
    return request<{ message: string; data: AppointmentRecord }>(
      `/api/appointments/${appointmentId}/status`,
      { method: "PATCH", body },
    );
  },

  listSimulatorClinics() {
    return request<{ message: string; data: PublicClinic[] }>("/api/simulator/clinics", {
      auth: false,
    });
  },

  getSimulatorClinic(clinicId: string) {
    return request<{ message: string; data: PublicClinicProfile }>(
      `/api/simulator/clinics/${clinicId}`,
      { auth: false },
    );
  },

  simulatorAvailability(
    clinicId: string,
    filters: { date: string; serviceId: string; staffId?: string },
  ) {
    return request<{ message: string; data: AvailabilityResult }>(
      `/api/simulator/clinics/${clinicId}/availability${query(filters)}`,
      { auth: false },
    );
  },

  startSimulatorConversation(
    clinicId: string,
    body: { phone: string; name?: string },
  ) {
    return request<{ message: string; data: SimulatorThread }>(
      `/api/simulator/clinics/${clinicId}/conversations`,
      { method: "POST", auth: false, body },
    );
  },

  sendSimulatorMessage(
    clinicId: string,
    body: {
      phone: string;
      messageText: string;
      clientMessageId: string;
      name?: string;
    },
  ) {
    return request<{
      success: boolean;
      message: string;
      data: {
        contactId: string;
        conversationId: string;
        inboundMessage: ChatMessage;
        assistantMessage: ChatMessage;
      };
    }>(`/api/simulator/clinics/${clinicId}/messages`, {
      method: "POST",
      auth: false,
      body,
    });
  },

  getSimulatorConversation(conversationId: string) {
    return request<{ message: string; data: SimulatorThread }>(
      `/api/simulator/conversations/${conversationId}`,
      { auth: false },
    );
  },

  bookSimulatorAppointment(
    conversationId: string,
    body: {
      serviceId: string;
      staffId: string;
      startAt: string;
      notes?: string;
      consent: true;
    },
  ) {
    return request<{
      message: string;
      data: {
        appointmentId: string;
        assistantMessage: ChatMessage;
        appointments: AppointmentRecord[];
      };
    }>(`/api/simulator/conversations/${conversationId}/appointments`, {
      method: "POST",
      auth: false,
      body,
    });
  },

  confirmSimulatorAppointment(conversationId: string, appointmentId: string) {
    return request<{
      message: string;
      data: {
        outcome: "CONFIRMED" | "ALREADY_CONFIRMED" | "EXPIRED";
        appointmentId: string;
        reply: string;
        messageId: string;
      };
    }>(
      `/api/simulator/conversations/${conversationId}/appointments/${appointmentId}/confirm`,
      { method: "POST", auth: false },
    );
  },
};
