"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CalendarMonth from "@/src/components/CalendarMonth";
import { apiGet } from "@/src/lib/api";

type CalendarItem = {
  _id: string;
  kind: "event" | "task"; // from /api/calendar
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;

  project?: { _id: string; name: string } | undefined;
};

// “pretty” date/time for week list
function prettyWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [weekItems, setWeekItems] = useState<CalendarItem[]>([]);
  const [weekLoading, setWeekLoading] = useState(true);
  const [weekError, setWeekError] = useState("");

  // this week range (Mon..Sun) in local time
  const range = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Mon=0
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, []);

  useEffect(() => {
    async function loadWeek() {
      setWeekLoading(true);
      setWeekError("");

      const fromISO = range.monday.toISOString();
      const toISO = range.sunday.toISOString();

      // ✅ use calendar endpoint so we also get project events + (personal events if included)
      const res = await apiGet<{ items: CalendarItem[]; error?: string }>(
        `/api/calendar?from=${encodeURIComponent(
          fromISO,
        )}&to=${encodeURIComponent(toISO)}`,
      );

      if (!res.ok) {
        setWeekItems([]);
        setWeekError(res.data.error || "Could not load week items");
        setWeekLoading(false);
        return;
      }

      const now = new Date();

      // ✅ show only upcoming (incl later today)
      const items = (res.data.items ?? [])
        .filter((it) => {
          const start = new Date(it.start);
          if (Number.isNaN(start.getTime())) return false;
          return start.getTime() >= now.getTime();
        })
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        );

      setWeekItems(items);
      setWeekLoading(false);
    }

    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.monday.getTime(), range.sunday.getTime()]);

  const weekCount = weekItems.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Overview across all your projects
          </p>
        </div>
      </div>

      {/* This week */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              This week
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
              {range.monday.toLocaleDateString("en-GB")} –{" "}
              {range.sunday.toLocaleDateString("en-GB")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-semibold leading-none">
              {weekLoading ? "…" : weekCount}
            </p>
            <p className="text-sm text-[rgb(var(--subtext))]">upcoming</p>
          </div>
        </div>

        {weekError ? (
          <p className="mt-4 text-sm text-red-600">{weekError}</p>
        ) : null}

        {!weekLoading && weekItems.length > 0 ? (
          <div className="mt-5 space-y-3">
            {weekItems.slice(0, 8).map((it) => {
              const isTask = it.kind === "task";
              return (
                <div
                  key={`${it.kind}-${it._id}`}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-white p-4 hover:bg-[rgb(var(--muted))] transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {isTask ? `📌 ${it.title}` : it.title}
                        </p>
                      </div>

                      <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
                        {prettyWhen(it.start)}
                        {it.project?.name ? ` · ${it.project.name}` : ""}
                      </p>
                    </div>

                    {/* Only open project if we actually have a project id */}
                    {it.project?._id ? (
                      <Link
                        className="shrink-0 text-sm font-medium text-[rgb(var(--primary))] hover:underline"
                        href={`/projects/${it.project._id}`}
                      >
                        Open
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {weekItems.length > 8 ? (
              <p className="text-xs text-[rgb(var(--subtext))]">
                +{weekItems.length - 8} more
              </p>
            ) : null}
          </div>
        ) : null}

        {!weekLoading && weekItems.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-white p-4">
            <p className="text-sm text-[rgb(var(--subtext))]">
              Nothing upcoming this week 🎉
            </p>
          </div>
        ) : null}
      </div>

      {/* Calendar */}
      <CalendarMonth mode="dashboard" title="Calendar (personal + projects)" />

      <p className="text-xs text-gray-500">
        Tip: project events are added inside projects; dashboard calendar shows
        everything across projects.
      </p>
    </div>
  );
}
