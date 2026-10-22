"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorBlock, LoadingBlock } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayName } from "@/lib/format";

interface DayDraft {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

function emptyWeek(): DayDraft[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: dayOfWeek === 0,
  }));
}

export default function WorkingHoursPage() {
  const { canManage } = useAuth();
  const [days, setDays] = useState<DayDraft[]>(emptyWeek);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.listWorkingHours();
      const next = emptyWeek();
      for (const day of result.data) {
        next[day.dayOfWeek] = {
          dayOfWeek: day.dayOfWeek,
          openTime: day.openTime || "09:00",
          closeTime: day.closeTime || "18:00",
          isClosed: day.isClosed,
        };
      }
      setDays(next);
      setSaved(result.data.length === 7);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load working hours.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<DayDraft>) {
    setDays((current) =>
      current.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)),
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    for (const day of days) {
      if (!day.isClosed && day.openTime >= day.closeTime) {
        toast.error(`${dayName(day.dayOfWeek)} must close after it opens.`);
        return;
      }
    }
    setSaving(true);
    try {
      await api.saveWorkingHours(
        days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isClosed: day.isClosed,
          ...(day.isClosed
            ? {}
            : {
                openTime: day.openTime.slice(0, 5),
                closeTime: day.closeTime.slice(0, 5),
              }),
        })),
      );
      setSaved(true);
      toast.success("Working hours saved");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Unable to save hours.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Working hours</h1>
        <p className="mt-2 text-muted-foreground">
          Sunday is day 0, matching the booking calendar. Availability uses this weekly schedule.
        </p>
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}
      {!loading && !error ? (
        <Card>
          <CardHeader>
            <CardTitle>{saved ? "Weekly schedule" : "Draft schedule"}</CardTitle>
            {!saved ? (
              <p className="text-sm text-muted-foreground">
                Nothing is stored until you save all seven days.
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              {days.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[140px_1fr_1fr_auto]"
                >
                  <p className="font-medium">{dayName(day.dayOfWeek)}</p>
                  <Input
                    type="time"
                    value={day.openTime}
                    disabled={!canManage || day.isClosed}
                    onChange={(event) => updateDay(day.dayOfWeek, { openTime: event.target.value })}
                    aria-label={`${dayName(day.dayOfWeek)} opening time`}
                  />
                  <Input
                    type="time"
                    value={day.closeTime}
                    disabled={!canManage || day.isClosed}
                    onChange={(event) => updateDay(day.dayOfWeek, { closeTime: event.target.value })}
                    aria-label={`${dayName(day.dayOfWeek)} closing time`}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={day.isClosed}
                      disabled={!canManage}
                      onChange={(event) => updateDay(day.dayOfWeek, { isClosed: event.target.checked })}
                    />
                    Closed
                  </label>
                </div>
              ))}
              {canManage ? (
                <Button type="submit" disabled={saving} className="h-10">
                  {saving ? "Saving…" : "Save working hours"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Staff accounts can view this schedule.</p>
              )}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
