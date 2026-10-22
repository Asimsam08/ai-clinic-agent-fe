"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBlock, FieldError, LoadingBlock, SelectInput } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fieldError } from "@/lib/format";

const timezones = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export default function ClinicProfilePage() {
  const { canManage, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [slug, setSlug] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getClinic();
      setName(result.data.name);
      setPhone(result.data.phone ?? "");
      setEmail(result.data.email ?? "");
      setAddress(result.data.address ?? "");
      setTimezone(result.data.timezone);
      setSlug(result.data.slug);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load the clinic.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    if (!canManage) return;
    setSaving(true);
    try {
      await api.updateClinic({
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        timezone,
      });
      await refresh();
      toast.success("Clinic profile saved");
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
        <h1 className="font-display text-4xl">Clinic profile</h1>
        <p className="mt-2 text-muted-foreground">
          Public details the receptionist can share with patients.
        </p>
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}
      {!loading && !error ? (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <p className="text-sm text-muted-foreground">Slug: {slug}</p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="name">Clinic name</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} required />
                <FieldError message={fieldError(errors, "name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!canManage} />
                <FieldError message={fieldError(errors, "phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canManage} />
                <FieldError message={fieldError(errors, "email")} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={address} onChange={(event) => setAddress(event.target.value)} disabled={!canManage} />
                <FieldError message={fieldError(errors, "address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <SelectInput id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={!canManage}>
                  {timezones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                  {!timezones.includes(timezone) ? <option value={timezone}>{timezone}</option> : null}
                </SelectInput>
              </div>
              <div className="md:col-span-2">
                {canManage ? (
                  <Button type="submit" disabled={saving} className="h-10">
                    {saving ? "Saving…" : "Save profile"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Staff accounts can view this profile.</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
