"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [state, action, pending] = useActionState(loginAdmin, null);

  return (
    <form action={action} className="card w-full max-w-sm space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <h1 className="text-xl font-semibold">Sistem e-Sijil &amp; Kehadiran</h1>
        <p className="text-sm text-gray-500 mt-1">Log masuk pentadbir</p>
      </div>
      <div>
        <label className="label" htmlFor="password">
          Kata laluan
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          autoFocus
          autoComplete="current-password"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Sedang log masuk…" : "Log Masuk"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
