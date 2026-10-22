"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { cn } from "cn";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/clinic", label: "Clinic profile", icon: Building2 },
  { href: "/dashboard/services", label: "Services", icon: Stethoscope },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/hours", label: "Working hours", icon: Clock3 },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function signOut() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:flex md:flex-col md:px-4 md:py-6">
        <div className="px-3 pb-6">
          <p className="font-display text-2xl leading-none">Clinic desk</p>
          <p className="mt-2 text-xs text-sidebar-foreground/70">
            {user?.clinic.name}
          </p>
        </div>
        <NavLinks />
        <div className="mt-auto px-3 pt-6 text-xs text-sidebar-foreground/70">
          <p>{user?.user.name}</p>
          <p className="mt-1">{user?.role}</p>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={signOut}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div>
            <p className="font-display text-xl leading-none">Clinic desk</p>
            <p className="text-xs text-muted-foreground">{user?.clinic.name}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
            <Menu />
            <span className="sr-only">Open navigation</span>
          </Button>
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
            <SheetHeader>
              <SheetTitle className="text-sidebar-foreground">Menu</SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <NavLinks onNavigate={() => setOpen(false)} />
              <Button variant="secondary" className="mt-6 w-full" onClick={signOut}>
                <LogOut />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
