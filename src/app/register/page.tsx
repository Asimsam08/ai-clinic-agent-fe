"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/form-controls";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fieldError } from "@/lib/format";

export default function RegisterPage() {
  const router = useRouter();
  const { establish } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [formError, setFormError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const localErrors: { field: string; message: string }[] = [];
    if (name.trim().length < 2) localErrors.push({ field: "name", message: "Name must be at least 2 characters" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      localErrors.push({ field: "email", message: "Invalid email address" });
    }
    if (password.length < 8) {
      localErrors.push({ field: "password", message: "Password must be at least 8 characters" });
    }
    if (clinicName.trim().length < 2) {
      localErrors.push({ field: "clinicName", message: "Clinic name must be at least 2 characters" });
    }
    setErrors(localErrors);
    setFormError("");
    if (localErrors.length > 0) return;

    setPending(true);
    try {
      const result = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        clinicName: clinicName.trim(),
      });
      await establish(result.data);
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Registration failed.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Register a clinic</CardTitle>
          <p className="text-sm text-muted-foreground">
            This creates your owner account and an empty clinic.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
              <FieldError message={fieldError(errors, "name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clinicName">Clinic name</Label>
              <Input id="clinicName" value={clinicName} onChange={(event) => setClinicName(event.target.value)} required />
              <FieldError message={fieldError(errors, "clinicName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <FieldError message={fieldError(errors, "email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
              <FieldError message={fieldError(errors, "password")} />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              {pending ? "Creating clinic…" : "Create clinic"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-primary">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
