import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">
        AI Clinic Agent
      </p>
      <h1 className="font-display mt-4 max-w-2xl text-5xl leading-[1.05] text-balance sm:text-6xl">
        Run the front desk, then try the patient conversation.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Clinic staff configure services, hours, and appointments. Patients use a
        labeled demo chat to talk with the AI receptionist and book a real slot.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
          Clinic dashboard
        </Link>
        <Link
          href="/simulator"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}
        >
          Patient simulator
        </Link>
        <Link
          href="/register"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 px-5")}
        >
          Register a clinic
        </Link>
      </div>
    </main>
  );
}
