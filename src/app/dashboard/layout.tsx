"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { LoadingBlock } from "@/components/form-controls";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <main className="min-h-screen">
        <LoadingBlock label="Checking your session" />
      </main>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
