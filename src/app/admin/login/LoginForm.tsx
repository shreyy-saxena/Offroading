"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CtaButton } from "@/components/ui/CtaButton";
import { Logo } from "@/components/ui/Logo";
import { signInAdminAction } from "./actions";

const inputClassName = "rounded-card border border-hairline bg-surface px-4 py-3 text-body text-ink";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await signInAdminAction(email.trim(), password);
      if (result.outcome === "error") {
        setError(result.message);
        setSubmitting(false);
        return;
      }
      // A fresh Server Component render is needed for the (protected)
      // layout's guard to see the just-set session cookies.
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong signing in — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-svh flex-col justify-center gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Logo />
        <h1 className="text-heading text-ink">Admin sign in</h1>
        <p className="text-body text-muted">Invite-only access to the Offroading dashboard.</p>
      </header>

      {error ? <p className="text-body text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Email address</span>
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-muted">Password</span>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      <CtaButton type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </CtaButton>
    </form>
  );
}
