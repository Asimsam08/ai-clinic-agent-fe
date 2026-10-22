"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { ErrorBlock, FieldError, LoadingBlock } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fieldError } from "@/lib/format";
import type { StaffMember } from "@/lib/types";

export default function StaffPage() {
  const { canManage } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<StaffMember | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.listStaff();
      setStaff(result.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createMember(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      await api.createStaff({
        name: name.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      setName("");
      setTitle("");
      setPhone("");
      setEmail("");
      toast.success("Staff member added");
      await load();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fieldErrors);
        toast.error(caught.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Staff</h1>
        <p className="mt-2 text-muted-foreground">
          Appointments are booked against an active staff member.
        </p>
      </div>
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add staff</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createMember}>
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">Name</Label>
                <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} required />
                <FieldError message={fieldError(errors, "name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-title">Title</Label>
                <Input id="staff-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Dentist" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input id="staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                <FieldError message={fieldError(errors, "phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Email</Label>
                <Input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <FieldError message={fieldError(errors, "email")} />
              </div>
              <div>
                <Button type="submit" disabled={saving} className="h-10">
                  {saving ? "Saving…" : "Add staff member"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}
      <div className="grid gap-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {member.name}{" "}
                  <span className="text-sm text-muted-foreground">
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {[member.title, member.phone, member.email].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
              {canManage ? (
                <Button variant="outline" onClick={() => setEditing(member)}>Edit</Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!loading && staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff yet.</p>
        ) : null}
      </div>
      <StaffEditor
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    </div>
  );
}

function StaffEditor({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setTitle(member.title ?? "");
    setPhone(member.phone ?? "");
    setEmail(member.email ?? "");
    setIsActive(member.isActive);
  }, [member]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!member) return;
    setSaving(true);
    try {
      await api.updateStaff(member.id, {
        name: name.trim(),
        title: title.trim() ? title.trim() : null,
        phone: phone.trim() ? phone.trim() : null,
        email: email.trim() ? email.trim() : null,
        isActive,
      });
      toast.success("Staff member updated");
      await onSaved();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(member)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit staff</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={save}>
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-name">Name</Label>
            <Input id="edit-staff-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-title">Title</Label>
            <Input id="edit-staff-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-phone">Phone</Label>
            <Input id="edit-staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-email">Email</Label>
            <Input id="edit-staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
