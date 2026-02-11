"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "bg-white border border-[rgb(var(--border))] text-[rgb(var(--text))] shadow-sm"
          : "text-[rgb(var(--subtext))] hover:text-[rgb(var(--text))] hover:bg-white hover:border hover:border-[rgb(var(--border))]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
            <p className="text-sm text-[rgb(var(--subtext))]">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  const title =
    pathname === "/dashboard"
      ? "Dashboard"
      : pathname?.startsWith("/projects")
        ? "Projects"
        : "Workspace";

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="sticky top-6 self-start hidden md:flex md:w-64 md:flex-col md:gap-3">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
              <div className="text-sm font-semibold tracking-tight">
                StudentCollab
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                Projects · Tasks · Calendar
              </div>
            </div>

            <nav className="space-y-1">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/projects" label="Projects" />
            </nav>

            <div className="mt-auto rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-sm">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition"
              >
                Logout
              </button>
            </div>
          </aside>

          {/* Main column */}
          <div className="min-w-0 flex-1 space-y-4">
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
