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

export default function LoginPage() {
  const router = useRouter();
  const { establish } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [formError, setFormError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    setFormError("");

    if (!email.trim() || !password) {
      setFormError("Email and password are required.");
      return;
    }

    setPending(true);
    try {
      const result = await api.login({ email: email.trim(), password });
      await establish(result.data);
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Login failed.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use the clinic account created at registration.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <FieldError message={fieldError(errors, "email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <FieldError message={fieldError(errors, "password")} />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            New clinic?{" "}
            <Link href="/register" className="font-medium text-primary">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
