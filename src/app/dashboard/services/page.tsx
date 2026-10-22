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
import { Textarea } from "@/components/ui/textarea";
import { ErrorBlock, FieldError, LoadingBlock } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fieldError, formatPrice } from "@/lib/format";
import type { ClinicService } from "@/lib/types";

export default function ServicesPage() {
  const { canManage } = useAuth();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [editing, setEditing] = useState<ClinicService | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.listServices();
      setServices(result.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createService(event: FormEvent) {
    event.preventDefault();
    const durationMinutes = Number(duration);
    const local: { field: string; message: string }[] = [];
    if (name.trim().length < 2) local.push({ field: "name", message: "Service name must be at least 2 characters" });
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
      local.push({ field: "durationMinutes", message: "Duration must be between 5 and 480 minutes" });
    }
    if (price.trim() && Number(price) < 0) local.push({ field: "price", message: "Price cannot be negative" });
    setErrors(local);
    if (local.length > 0) return;

    setSaving(true);
    try {
      await api.createService({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        durationMinutes,
        ...(price.trim() ? { price: Number(price) } : {}),
      });
      setName("");
      setDescription("");
      setDuration("30");
      setPrice("");
      toast.success("Service created");
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
        <h1 className="font-display text-4xl">Services and pricing</h1>
        <p className="mt-2 text-muted-foreground">
          Active services are what the receptionist can offer.
        </p>
      </div>
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a service</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createService}>
              <div className="space-y-1.5">
                <Label htmlFor="service-name">Name</Label>
                <Input id="service-name" value={name} onChange={(event) => setName(event.target.value)} required />
                <FieldError message={fieldError(errors, "name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" type="number" min={5} max={480} value={duration} onChange={(event) => setDuration(event.target.value)} required />
                <FieldError message={fieldError(errors, "durationMinutes")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Optional" />
                <FieldError message={fieldError(errors, "price")} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div>
                <Button type="submit" disabled={saving} className="h-10">
                  {saving ? "Saving…" : "Add service"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}
      <div className="grid gap-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {service.name}{" "}
                  <span className="text-sm text-muted-foreground">
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {service.durationMinutes} min · {formatPrice(service.price)}
                </p>
                {service.description ? (
                  <p className="mt-1 text-sm">{service.description}</p>
                ) : null}
              </div>
              {canManage ? (
                <Button variant="outline" onClick={() => setEditing(service)}>
                  Edit
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {!loading && services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet.</p>
        ) : null}
      </div>
      <ServiceEditor
        service={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    </div>
  );
}

function ServiceEditor({
  service,
  onClose,
  onSaved,
}: {
  service: ClinicService | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);

  useEffect(() => {
    if (!service) return;
    setName(service.name);
    setDescription(service.description ?? "");
    setDuration(String(service.durationMinutes));
    setPrice(service.price === null ? "" : String(service.price));
    setIsActive(service.isActive);
    setErrors([]);
  }, [service]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!service) return;
    setSaving(true);
    setErrors([]);
    try {
      await api.updateService(service.id, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        durationMinutes: Number(duration),
        price: price.trim() ? Number(price) : null,
        isActive,
      });
      toast.success("Service updated");
      await onSaved();
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
    <Dialog open={Boolean(service)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit service</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={save}>
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(event) => setName(event.target.value)} />
            <FieldError message={fieldError(errors, "name")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-duration">Duration</Label>
            <Input id="edit-duration" type="number" min={5} max={480} value={duration} onChange={(event) => setDuration(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-price">Price</Label>
            <Input id="edit-price" type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(event) => setDescription(event.target.value)} />
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
