"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBlock, LoadingBlock, SelectInput } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import {
  clinicToday,
  dayName,
  displayStatus,
  formatDateTime,
  formatMessageTime,
  formatPrice,
  formatTime,
} from "@/lib/format";
import type {
  AppointmentRecord,
  AvailabilitySlot,
  ChatMessage,
  PublicClinic,
  PublicClinicProfile,
} from "@/lib/types";

const STORAGE_KEY = "clinic-simulator-session";

interface StoredSession {
  clinicId: string;
  phone: string;
  name: string;
  conversationId: string;
}

export default function SimulatorPage() {
  const [clinics, setClinics] = useState<PublicClinic[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [clinicError, setClinicError] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [gateError, setGateError] = useState("");
  const [starting, setStarting] = useState(false);
  const [profile, setProfile] = useState<PublicClinicProfile | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsMessage, setSlotsMessage] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [consent, setConsent] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const pendingMessages = useRef<ChatMessage[]>([]);

  const selectedSlot = slots.find((slot) => slot.startAt === selectedStart);
  const timezone = profile?.clinic.timezone ?? "Asia/Kolkata";

  async function loadClinics() {
    setLoadingClinics(true);
    setClinicError("");
    try {
      const result = await api.listSimulatorClinics();
      setClinics(result.data);
      const stored = readSession();
      const initial = result.data.find((clinic) => clinic.id === stored?.clinicId)?.id
        ?? result.data[0]?.id
        ?? "";
      setClinicId(initial);
      if (stored) {
        setPhone(stored.phone);
        setName(stored.name);
      }
    } catch (caught) {
      setClinicError(caught instanceof ApiError ? caught.message : "Unable to load clinics.");
    } finally {
      setLoadingClinics(false);
    }
  }

  useEffect(() => {
    void loadClinics();
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, sending]);

  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => {
      void refreshThread(conversationId);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  function mergeWithPending(serverMessages: ChatMessage[]) {
    const stillPending = pendingMessages.current.filter((pending) => {
      const saved = serverMessages.some(
        (message) =>
          message.direction === "INBOUND" &&
          message.content === pending.content &&
          new Date(message.createdAt).getTime() >= new Date(pending.createdAt).getTime() - 5000,
      );
      return !saved;
    });
    pendingMessages.current = stillPending;
    return stillPending.length > 0 ? [...serverMessages, ...stillPending] : serverMessages;
  }

  async function refreshThread(id: string) {
    try {
      const result = await api.getSimulatorConversation(id);
      setMessages(mergeWithPending(result.data.messages));
      setAppointments(result.data.appointments);
    } catch {
      // A background refresh should not wipe the conversation already on screen.
    }
  }

  async function enterChat(event: FormEvent) {
    event.preventDefault();
    setGateError("");
    if (!clinicId) {
      setGateError("Select a clinic.");
      return;
    }
    if (phone.trim().length < 7) {
      setGateError("Enter the phone number you want this demo conversation to use.");
      return;
    }
    if (name.trim() && name.trim().length < 2) {
      setGateError("Name must be at least 2 characters, or leave it blank.");
      return;
    }

    setStarting(true);
    try {
      const [profileResult, thread] = await Promise.all([
        api.getSimulatorClinic(clinicId),
        api.startSimulatorConversation(clinicId, {
          phone: phone.trim(),
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      ]);
      setProfile(profileResult.data);
      setServiceId(profileResult.data.services[0]?.id ?? "");
      setDate(clinicToday(profileResult.data.clinic.timezone));
      const id = thread.data.conversation?.id ?? "";
      setConversationId(id);
      pendingMessages.current = [];
      setMessages(thread.data.messages);
      setAppointments(thread.data.appointments);
      setSlots([]);
      setSelectedStart("");
      setConsent(false);
      if (id) {
        writeSession({ clinicId, phone: phone.trim(), name: name.trim(), conversationId: id });
      }
    } catch (caught) {
      setGateError(caught instanceof ApiError ? caught.message : "Unable to start the demo chat.");
    } finally {
      setStarting(false);
    }
  }

  async function sendMessage(text: string) {
    const messageText = text.trim();
    if (!messageText || !conversationId || sending) return;
    const optimistic: ChatMessage = {
      id: `pending-${crypto.randomUUID()}`,
      direction: "INBOUND",
      senderType: "CUSTOMER",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    pendingMessages.current = [...pendingMessages.current, optimistic];
    setMessages((current) => [...current, optimistic]);
    setSending(true);
    setChatError("");
    setDraft("");
    try {
      const result = await api.sendSimulatorMessage(clinicId, {
        phone: phone.trim(),
        messageText,
        clientMessageId: crypto.randomUUID(),
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      pendingMessages.current = pendingMessages.current.filter((message) => message.id !== optimistic.id);
      setConversationId(result.data.conversationId);
      setMessages((current) => {
        const withoutPending = current.filter((message) => message.id !== optimistic.id);
        const ids = new Set(withoutPending.map((message) => message.id));
        const next = [...withoutPending];
        if (!ids.has(result.data.inboundMessage.id)) next.push(result.data.inboundMessage);
        if (!ids.has(result.data.assistantMessage.id)) next.push(result.data.assistantMessage);
        return next;
      });
      const thread = await api.getSimulatorConversation(result.data.conversationId);
      setMessages(mergeWithPending(thread.data.messages));
      setAppointments(thread.data.appointments);
    } catch (caught) {
      setChatError(caught instanceof ApiError ? caught.message : "The receptionist could not reply.");
    } finally {
      setSending(false);
    }
  }

  async function checkSlots(event: FormEvent) {
    event.preventDefault();
    if (!serviceId || !date) {
      setSlotsMessage("Choose a service and date.");
      return;
    }
    setLoadingSlots(true);
    setSlotsMessage("");
    setSelectedStart("");
    setSelectedStaffId("");
    setConsent(false);
    try {
      const result = await api.simulatorAvailability(clinicId, { date, serviceId });
      setSlots(result.data.slots);
      if (result.data.slots.length === 0) {
        setSlotsMessage("No open slots on that date. Try another day.");
      }
    } catch (caught) {
      setSlots([]);
      setSlotsMessage(caught instanceof ApiError ? caught.message : "Unable to check availability.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function placeHold() {
    if (!selectedSlot || !selectedStaffId || !consent) return;
    setBooking(true);
    setSlotsMessage("");
    try {
      const result = await api.bookSimulatorAppointment(conversationId, {
        serviceId,
        staffId: selectedStaffId,
        startAt: selectedSlot.startAt,
        consent: true,
      });
      setAppointments(result.data.appointments);
      setMessages((current) => [...current, result.data.assistantMessage]);
      setConsent(false);
      setSelectedStart("");
    } catch (caught) {
      setSlotsMessage(caught instanceof ApiError ? caught.message : "The hold could not be created.");
    } finally {
      setBooking(false);
    }
  }

  async function confirmAppointment(appointmentId: string) {
    setConfirmingId(appointmentId);
    setChatError("");
    try {
      const result = await api.confirmSimulatorAppointment(conversationId, appointmentId);
      setMessages((current) => [
        ...current,
        {
          id: result.data.messageId,
          direction: "OUTBOUND",
          senderType: "AI",
          content: result.data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      await refreshThread(conversationId);
    } catch (caught) {
      setChatError(caught instanceof ApiError ? caught.message : "Confirmation failed.");
    } finally {
      setConfirmingId("");
    }
  }

  function leaveChat() {
    pendingMessages.current = [];
    sessionStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setConversationId("");
    setMessages([]);
    setAppointments([]);
  }

  const hours = useMemo(
    () =>
      (profile?.workingHours ?? [])
        .map((day) =>
          day.isClosed
            ? `${dayName(day.dayOfWeek)} closed`
            : `${dayName(day.dayOfWeek)} ${day.openTime}–${day.closeTime}`,
        )
        .join(" · "),
    [profile],
  );

  return (
    <main className="min-h-screen bg-[oklch(0.95_0.02_85)]">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-amber-800 uppercase">
              Demo only · not connected to WhatsApp
            </p>
            <h1 className="font-display text-3xl">Patient simulator</h1>
          </div>
          <Link href="/" className="text-sm font-medium text-primary">
            Back home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="order-1 overflow-hidden rounded-[2rem] border bg-[#0b141a] text-white shadow-xl lg:order-none">
          {!conversationId ? (
            <div className="bg-[#efeae2] p-4 text-foreground">
              <p className="mb-4 text-sm text-stone-700">
                Enter a phone number and clinic. Messages stay in this demo and are saved to the clinic database.
              </p>
              {loadingClinics ? <LoadingBlock label="Loading clinics" /> : null}
              {clinicError ? <ErrorBlock message={clinicError} onRetry={loadClinics} /> : null}
              {!loadingClinics && !clinicError && clinics.length === 0 ? (
                <p className="text-sm">
                  No active clinics yet. Register one from the dashboard first.
                </p>
              ) : null}
              {clinics.length > 0 ? (
                <form className="space-y-3" onSubmit={enterChat}>
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-name">Your name</Label>
                    <Input id="sim-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-phone">Phone number</Label>
                    <Input id="sim-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-clinic">Clinic</Label>
                    <SelectInput id="sim-clinic" value={clinicId} onChange={(event) => setClinicId(event.target.value)}>
                      {clinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                          {clinic.address ? ` · ${clinic.address}` : ""}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  {gateError ? <p className="text-sm text-destructive">{gateError}</p> : null}
                  <Button type="submit" className="h-10 w-full" disabled={starting}>
                    {starting ? "Opening chat…" : "Open demo chat"}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-[#075e54] px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{profile?.clinic.name}</p>
                  <p className="text-xs text-emerald-100">AI receptionist · demo</p>
                </div>
                <button type="button" className="cursor-pointer text-xs underline" onClick={leaveChat}>
                  Change clinic
                </button>
              </div>
              <div ref={threadRef} className="h-[28rem] space-y-2 overflow-y-auto bg-[#efeae2] px-3 py-4 text-stone-900">
                {messages.length === 0 ? (
                  <p className="mx-auto max-w-xs rounded-lg bg-white/80 px-3 py-2 text-center text-xs text-stone-600">
                    Say hello, ask about services, or pick a real slot in the booking panel.
                  </p>
                ) : null}
                {messages.map((message) => {
                  const mine = message.direction === "INBOUND";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${mine ? "bg-[#d9fdd3]" : "bg-white"}`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-1 text-right text-[10px] text-stone-500">
                          {message.senderType === "AI" ? "Receptionist · " : ""}
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {sending ? (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-white px-3 py-2 text-sm text-stone-500">
                      Receptionist is typing…
                    </div>
                  </div>
                ) : null}
              </div>
              <form
                className="flex items-end gap-2 bg-[#f0f2f5] p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(draft);
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Message"
                  rows={2}
                  className="bg-white text-stone-900"
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !draft.trim()} className="h-10">
                  Send
                </Button>
              </form>
              {chatError ? <p className="bg-[#f0f2f5] px-3 pb-3 text-sm text-red-700">{chatError}</p> : null}
            </>
          )}
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available slots</CardTitle>
              <p className="text-sm text-muted-foreground">
                Times come from the clinic schedule and existing bookings. Choosing a slot does not book it until you consent.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!conversationId ? (
                <p className="text-sm text-muted-foreground">Open the demo chat before checking slots.</p>
              ) : (
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={checkSlots}>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="slot-service">Service</Label>
                    <SelectInput id="slot-service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                      {(profile?.services ?? []).map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} · {service.durationMinutes} min · {formatPrice(service.price)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-date">Date</Label>
                    <Input id="slot-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="outline" disabled={loadingSlots || !serviceId} className="h-9 w-full">
                      {loadingSlots ? "Checking…" : "Show real slots"}
                    </Button>
                  </div>
                </form>
              )}
              {(profile?.services.length ?? 0) === 0 && conversationId ? (
                <p className="text-sm text-muted-foreground">This clinic has no active services yet.</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => {
                      setSelectedStart(slot.startAt);
                      setSelectedStaffId(slot.availableStaff[0]?.id ?? "");
                      setConsent(false);
                    }}
                    className={`cursor-pointer rounded-lg border px-2 py-2 text-left text-sm ${selectedStart === slot.startAt ? "border-primary bg-accent" : "bg-background"}`}
                  >
                    <span className="block font-medium">{formatTime(slot.startAt, timezone)}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(slot.startAt, timezone)}</span>
                  </button>
                ))}
              </div>
              {selectedSlot ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-staff">Staff member</Label>
                    <SelectInput
                      id="slot-staff"
                      value={selectedStaffId}
                      onChange={(event) => setSelectedStaffId(event.target.value)}
                    >
                      {selectedSlot.availableStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}{member.title ? ` · ${member.title}` : ""}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    I agree to place a pending hold for this exact slot. I understand it is not confirmed until I confirm it.
                  </label>
                  <Button type="button" disabled={!consent || !selectedStaffId || booking} onClick={() => void placeHold()}>
                    {booking ? "Placing hold…" : "Book this slot"}
                  </Button>
                </div>
              ) : null}
              {slotsMessage ? <p className="text-sm text-muted-foreground">{slotsMessage}</p> : null}
              {hours ? <p className="text-xs text-muted-foreground">{hours}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved appointments for this phone at this clinic.</p>
              ) : (
                appointments.map((appointment) => {
                  const shown = displayStatus(appointment);
                  return (
                    <div key={appointment.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{appointment.service.name}</p>
                        <StatusBadge status={shown} />
                      </div>
                      <p className="mt-1">{formatDateTime(appointment.startAt, timezone)}</p>
                      <p className="text-muted-foreground">
                        {appointment.staff?.name ?? "Staff"} · {appointment.source ?? "booking"}
                      </p>
                      {appointment.confirmationExpiresAt && shown === "PENDING" ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Hold expires {formatDateTime(appointment.confirmationExpiresAt, timezone)}
                        </p>
                      ) : null}
                      {shown === "PENDING" ? (
                        <Button
                          className="mt-3"
                          size="sm"
                          disabled={confirmingId === appointment.id}
                          onClick={() => void confirmAppointment(appointment.id)}
                        >
                          {confirmingId === appointment.id ? "Confirming…" : "Confirm appointment"}
                        </Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
