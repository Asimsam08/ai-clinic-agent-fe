"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBlock, LoadingBlock, SelectInput } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { displayStatus, formatDateTime, formatTime } from "@/lib/format";
import type {
  AppointmentRecord,
  AppointmentStatus,
  AvailabilitySlot,
  Clinic,
  ClinicService,
  StaffMember,
} from "@/lib/types";

const filters: { label: string; value: "" | AppointmentStatus }[] = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "No-show", value: "NO_SHOW" },
];

export default function AppointmentsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [status, setStatus] = useState<"" | AppointmentStatus>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [clinicResult, appointmentResult, serviceResult, staffResult] =
        await Promise.all([
          api.getClinic(),
          api.listAppointments({
            ...(status ? { status } : {}),
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
          }),
          api.listServices(),
          api.listStaff(),
        ]);
      setClinic(clinicResult.data);
      setAppointments(appointmentResult.data);
      setServices(serviceResult.data.filter((service) => service.isActive));
      setStaff(staffResult.data.filter((member) => member.isActive));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Filters are applied explicitly so typing a date does not fire a request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeStatus(
    appointment: AppointmentRecord,
    next: Exclude<AppointmentStatus, "PENDING">,
  ) {
    setBusyId(appointment.id);
    try {
      await api.updateAppointmentStatus(appointment.id, { status: next });
      toast.success("Appointment updated");
      await load();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Update failed");
      await load();
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl">Appointments</h1>
          <p className="mt-2 text-muted-foreground">
            Pending holds expire if the patient does not confirm them.
          </p>
        </div>
        <Button className="h-10" onClick={() => setBookingOpen(true)}>
          New appointment
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 py-4 md:grid-cols-4">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {filters.map((filter) => (
              <option key={filter.label} value={filter.value}>{filter.label}</option>
            ))}
          </SelectInput>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
          <Button type="button" variant="outline" onClick={() => void load()}>
            Apply filters
          </Button>
        </CardContent>
      </Card>

      {loading ? <LoadingBlock label="Loading appointments" /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{formatDateTime(appointment.startAt, clinic?.timezone)}</TableCell>
                    <TableCell>
                      <div>{appointment.contact.name || "Unnamed patient"}</div>
                      <div className="text-xs text-muted-foreground">{appointment.contact.phone}</div>
                    </TableCell>
                    <TableCell>{appointment.service.name}</TableCell>
                    <TableCell>{appointment.staff?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={displayStatus(appointment)} />
                    </TableCell>
                    <TableCell>
                      <StatusActions
                        appointment={appointment}
                        busy={busyId === appointment.id}
                        onChange={changeStatus}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {formatDateTime(appointment.startAt, clinic?.timezone)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{appointment.contact.name || "Unnamed patient"} · {appointment.contact.phone}</p>
                  <p>{appointment.service.name} · {appointment.staff?.name ?? "No staff"}</p>
                  <StatusBadge status={displayStatus(appointment)} />
                  <StatusActions
                    appointment={appointment}
                    busy={busyId === appointment.id}
                    onChange={changeStatus}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments match these filters.</p>
          ) : null}
        </>
      ) : null}

      <BookingDialog
        open={bookingOpen}
        services={services}
        staff={staff}
        timezone={clinic?.timezone ?? "Asia/Kolkata"}
        onClose={() => setBookingOpen(false)}
        onCreated={async () => {
          setBookingOpen(false);
          await load();
        }}
      />
    </div>
  );
}

function StatusActions({
  appointment,
  busy,
  onChange,
}: {
  appointment: AppointmentRecord;
  busy: boolean;
  onChange: (
    appointment: AppointmentRecord,
    status: Exclude<AppointmentStatus, "PENDING">,
  ) => void;
}) {
  const shown = displayStatus(appointment);
  if (shown === "EXPIRED" || shown === "CANCELLED" || shown === "COMPLETED" || shown === "NO_SHOW") {
    return <span className="text-xs text-muted-foreground">No further actions</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {appointment.status === "PENDING" ? (
        <Button size="sm" disabled={busy} onClick={() => onChange(appointment, "CONFIRMED")}>
          Confirm
        </Button>
      ) : null}
      {appointment.status === "CONFIRMED" ? (
        <>
          <Button size="sm" disabled={busy} onClick={() => onChange(appointment, "COMPLETED")}>
            Complete
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onChange(appointment, "NO_SHOW")}>
            No-show
          </Button>
        </>
      ) : null}
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => onChange(appointment, "CANCELLED")}>
        Cancel
      </Button>
    </div>
  );
}

function BookingDialog({
  open,
  services,
  staff,
  timezone,
  onClose,
  onCreated,
}: {
  open: boolean;
  services: ClinicService[];
  staff: StaffMember[];
  timezone: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setPatientName("");
    setPhone("");
    setEmail("");
    setServiceId(services[0]?.id ?? "");
    setStaffId("");
    setDate("");
    setNotes("");
    setSlots([]);
    setSelected("");
    setMessage("");
  }, [open, services]);

  async function loadSlots(event: FormEvent) {
    event.preventDefault();
    if (!serviceId || !date) {
      setMessage("Choose a service and date.");
      return;
    }
    setLoadingSlots(true);
    setMessage("");
    setSelected("");
    try {
      const result = await api.availability({
        date,
        serviceId,
        ...(staffId ? { staffId } : {}),
      });
      setSlots(result.data.slots);
      if (result.data.slots.length === 0) setMessage("No open slots on that date.");
    } catch (caught) {
      setSlots([]);
      setMessage(caught instanceof ApiError ? caught.message : "Unable to check availability.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function book() {
    const slot = slots.find((item) => item.startAt === selected);
    const chosenStaff = slot?.availableStaff.find((member) => !staffId || member.id === staffId) ?? slot?.availableStaff[0];
    if (!slot || !chosenStaff) {
      setMessage("Choose an available slot.");
      return;
    }
    if (phone.trim().length < 7) {
      setMessage("Enter a patient phone number of at least 7 characters.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const contact = await api.createContact({
        phone: phone.trim(),
        ...(patientName.trim() ? { name: patientName.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      await api.createAppointment({
        contactId: contact.data.id,
        serviceId,
        staffId: chosenStaff.id,
        startAt: slot.startAt,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success("Pending appointment created");
      await onCreated();
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Booking failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Book from the desk</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={loadSlots}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="patient-name">Patient name</Label>
              <Input id="patient-name" value={patientName} onChange={(event) => setPatientName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient-phone">Phone</Label>
              <Input id="patient-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="patient-email">Email</Label>
            <Input id="patient-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="booking-service">Service</Label>
              <SelectInput id="booking-service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </SelectInput>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-staff">Staff</Label>
              <SelectInput id="booking-staff" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                <option value="">Any available</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </SelectInput>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking-date">Date</Label>
            <Input id="booking-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking-notes">Notes</Label>
            <Textarea id="booking-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={loadingSlots || services.length === 0}>
            {loadingSlots ? "Checking…" : "Check availability"}
          </Button>
        </form>
        {services.length === 0 || staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add an active service and staff member before booking.</p>
        ) : null}
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.startAt}
              type="button"
              onClick={() => setSelected(slot.startAt)}
              className={`rounded-lg border px-2 py-2 text-left text-sm ${selected === slot.startAt ? "border-primary bg-accent" : "bg-background"}`}
            >
              <span className="block font-medium">{formatTime(slot.startAt, timezone)}</span>
              <span className="text-xs text-muted-foreground">
                {slot.availableStaff.map((member) => member.name).join(", ")}
              </span>
            </button>
          ))}
        </div>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" disabled={!selected || saving} onClick={() => void book()}>
            {saving ? "Booking…" : "Create pending hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
