"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBlock, LoadingBlock } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clinicToday, displayStatus } from "@/lib/format";
import { cn } from "cn";

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({
    services: 0,
    staff: 0,
    today: 0,
    pending: 0,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [services, staff, clinic, appointments] = await Promise.all([
        api.listServices(),
        api.listStaff(),
        api.getClinic(),
        api.listAppointments({}),
      ]);
      const today = clinicToday(clinic.data.timezone);
      setCounts({
        services: services.data.filter((service) => service.isActive).length,
        staff: staff.data.filter((member) => member.isActive).length,
        today: appointments.data.filter(
          (appointment) =>
            clinicTodayFrom(appointment.startAt, clinic.data.timezone) === today,
        ).length,
        pending: appointments.data.filter(
          (appointment) => displayStatus(appointment) === "PENDING",
        ).length,
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load the dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Good to see you, {user?.user.name.split(" ")[0]}</h1>
        <p className="mt-2 text-muted-foreground">
          {user?.clinic.name} · {user?.role}
        </p>
      </div>
      {loading ? <LoadingBlock label="Loading clinic activity" /> : null}
      {error ? <ErrorBlock message={error} onRetry={load} /> : null}
      {!loading && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Active services" value={counts.services} />
            <Stat label="Active staff" value={counts.staff} />
            <Stat label="Appointments today" value={counts.today} />
            <Stat label="Pending holds" value={counts.pending} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Next setup steps</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm sm:flex-row">
              <Link href="/dashboard/services" className={cn(buttonVariants({ variant: "outline" }))}>
                Add a service
              </Link>
              <Link href="/dashboard/staff" className={cn(buttonVariants({ variant: "outline" }))}>
                Add staff
              </Link>
              <Link href="/dashboard/hours" className={cn(buttonVariants({ variant: "outline" }))}>
                Set hours
              </Link>
              <Link href="/simulator" className={cn(buttonVariants())}>
                Open patient simulator
              </Link>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function clinicTodayFrom(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-4xl">{value}</p>
      </CardContent>
    </Card>
  );
}
