"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();

    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    // Save JWT
    localStorage.setItem("token", data.token);

    // Redirect to projects dashboard
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
          Access your projects, tasks, and calendar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="inline-flex w-full items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition">
            Log in
          </button>
        </form>

        <p className="mt-4 text-sm text-[rgb(var(--subtext))]">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-[rgb(var(--primary))] hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
