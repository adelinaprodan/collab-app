"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();

    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    // Registration succeeded → redirect to login
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
          Start a new workspace for your student teams.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <input
            type="text"
            placeholder="Full name"
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            Sign up
          </button>
        </form>

        <p className="mt-4 text-sm text-[rgb(var(--subtext))]">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-[rgb(var(--primary))] hover:underline"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
