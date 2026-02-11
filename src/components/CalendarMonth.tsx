"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/src/lib/api";

export type CalendarEvent = {
  _id: string;
  kind: "event" | "task";
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;

  project?: { _id: string; name: string } | null;
  status?: "todo" | "doing" | "done";
  color?: string;
};

type Props = {
  title?: string;
  mode: "dashboard" | "project";
  projectId?: string; // required if mode==="project"
  allowCreate?: boolean; // ✅ NEW
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// Monday-based grid
function startOfCalendarGrid(month: Date) {
  const first = startOfMonth(month);
  const day = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - day);
  gridStart.setHours(0, 0, 0, 0);
  return gridStart;
}
function endOfCalendarGrid(month: Date) {
  const last = endOfMonth(month);
  const day = (last.getDay() + 6) % 7; // Mon=0
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - day));
  gridEnd.setHours(23, 59, 59, 999);
  return gridEnd;
}

function toDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function prettyTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeHHMM(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function eventDotColor(e: CalendarEvent) {
  // You can improve later (project color etc). For now:
  if (e.color) return e.color;

  if (e.kind === "task") {
    if (e.status === "done") return "#22c55e"; // green
    if (e.status === "doing") return "#f59e0b"; // orange
    return "#ef4444"; // red
  }
  return "#3b82f6"; // blue for calendar events
}

export default function CalendarMonth({
  title,
  mode,
  projectId,
  allowCreate = true,
}: Props) {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // create form
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAllDay, setNewAllDay] = useState(false);
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");

  // inline edit
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editStartTime, setEditStartTime] = useState("10:00");
  const [editEndTime, setEditEndTime] = useState("11:00");

  const range = useMemo(() => {
    const from = startOfCalendarGrid(cursor);
    const to = endOfCalendarGrid(cursor);
    return { from, to };
  }, [cursor]);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);

    // Monday-based index: Mon=0 ... Sun=6
    const leadingBlanks = (first.getDay() + 6) % 7;

    const totalDays = last.getDate(); // 28..31
    const cells: (Date | null)[] = [];

    // blanks before the 1st (we DO NOT show prev-month dates)
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);

    // month days
    for (let day = 1; day <= totalDays; day++) {
      cells.push(
        new Date(first.getFullYear(), first.getMonth(), day, 0, 0, 0, 0),
      );
    }

    // blanks after last day to complete the last row (we DO NOT show next-month dates)
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) cells.push(null);
    }

    return cells;
  }, [cursor]);

  function buildStartEndForSelectedDay(
    allDay: boolean,
    startHHMM: string,
    endHHMM: string,
  ) {
    if (!selectedDay) return null;

    const start = new Date(selectedDay);
    const end = new Date(selectedDay);

    if (allDay) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      const [sh, sm] = startHHMM.split(":").map(Number);
      const [eh, em] = endHHMM.split(":").map(Number);
      start.setHours(sh || 0, sm || 0, 0, 0);
      end.setHours(eh || 0, em || 0, 0, 0);
    }

    if (end.getTime() <= start.getTime()) {
      const fixed = new Date(start);
      fixed.setHours(fixed.getHours() + 1);
      end.setTime(fixed.getTime());
    }

    return { start, end };
  }

  async function load() {
    setLoading(true);
    setError("");

    if (mode === "project" && !projectId) {
      setError("Missing projectId for project calendar");
      setEvents([]);
      setLoading(false);
      return;
    }

    const fromISO = range.from.toISOString();
    const toISO = range.to.toISOString();

    const url =
      mode === "project"
        ? `/api/calendar?from=${encodeURIComponent(
            fromISO,
          )}&to=${encodeURIComponent(toISO)}&projectId=${encodeURIComponent(
            projectId!,
          )}`
        : `/api/calendar?from=${encodeURIComponent(
            fromISO,
          )}&to=${encodeURIComponent(toISO)}`;

    const res = await apiGet<{ items: CalendarEvent[]; error?: string }>(url);

    if (!res.ok) {
      setError(res.data.error || "Could not load calendar");
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(res.data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, projectId, range.from.getTime(), range.to.getTime()]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = toDate(e.start);
      const key = ymd(d);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const [k, list] of map) {
      list.sort(
        (a, b) => toDate(a.start).getTime() - toDate(b.start).getTime(),
      );
      map.set(k, list);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDay.get(ymd(selectedDay)) ?? [];
  }, [selectedDay, eventsByDay]);

  function eventApiBase(e: CalendarEvent) {
    // If it has project -> it’s a project event (even on dashboard)
    if (e.project?._id) return `/api/projects/${e.project._id}/events/${e._id}`;
    // otherwise personal
    return `/api/events/${e._id}`;
  }

  async function createEvent() {
    if (!selectedDay) return;
    if (!newTitle.trim()) return;

    setCreating(true);
    setError("");

    const built = buildStartEndForSelectedDay(
      newAllDay,
      newStartTime,
      newEndTime,
    );
    if (!built) {
      setCreating(false);
      return;
    }

    // project create
    if (mode === "project") {
      if (!projectId) {
        setError("Missing projectId");
        setCreating(false);
        return;
      }

      const res = await apiPost<{ event?: any; error?: string }>(
        `/api/projects/${projectId}/events`,
        {
          title: newTitle,
          description: newDesc,
          start: built.start.toISOString(),
          end: built.end.toISOString(),
          allDay: newAllDay,
        },
      );

      if (!res.ok) {
        setError(res.data.error || "Could not create project event");
        setCreating(false);
        return;
      }
    } else {
      // personal create
      const res = await apiPost<{ event?: any; error?: string }>(
        `/api/events`,
        {
          title: newTitle,
          description: newDesc,
          start: built.start.toISOString(),
          end: built.end.toISOString(),
          allDay: newAllDay,
        },
      );

      if (!res.ok) {
        setError(res.data.error || "Could not create personal event");
        setCreating(false);
        return;
      }
    }

    setNewTitle("");
    setNewDesc("");
    setNewAllDay(false);
    setCreating(false);
    await load();
  }

  const monthLabel = useMemo(() => {
    return cursor.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }, [cursor]);

  const isInMonth = (d: Date) => d.getMonth() === cursor.getMonth();

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            {title ?? "Calendar"}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            {monthLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition"
            type="button"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ←
          </button>
          <button
            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition"
            type="button"
            onClick={() => setCursor(new Date())}
          >
            Today
          </button>
          <button
            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition"
            type="button"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            →
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-[rgb(var(--subtext))] mb-3">Loading…</p>
      ) : null}

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2 text-xs text-[rgb(var(--subtext))] mb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
          <div key={w} className="px-1">
            {w}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, idx) => {
          if (!d) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[92px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]"
              />
            );
          }
          const key = ymd(d);
          const list = eventsByDay.get(key) ?? [];
          const selected = selectedDay ? isSameDay(d, selectedDay) : false;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={[
                "group rounded-2xl border border-[rgb(var(--border))] p-2 text-left min-h-[92px] transition",
                selected
                  ? "ring-4 ring-indigo-100"
                  : "hover:bg-[rgb(var(--muted))]",
                isInMonth(d) ? "bg-white" : "bg-[rgb(var(--muted))]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    isInMonth(d)
                      ? "text-sm font-medium"
                      : "text-sm font-medium text-[rgb(var(--subtext))]"
                  }
                >
                  {d.getDate()}
                </span>
                {list.length > 0 ? (
                  <span className="text-[10px] text-[rgb(var(--subtext))]">
                    {list.length}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 space-y-1">
                {list.slice(0, 2).map((e) => (
                  <div
                    key={`${e.kind}-${e._id}`}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: eventDotColor(e) }}
                    />
                    <p className="text-xs truncate text-[rgb(var(--text))]">
                      {e.kind === "task" ? `📌 ${e.title}` : e.title}
                      {mode === "dashboard" && e.project?.name
                        ? ` · ${e.project.name}`
                        : ""}
                    </p>
                  </div>
                ))}
                {list.length > 2 ? (
                  <p className="text-[10px] text-[rgb(var(--subtext))]">
                    +{list.length - 2} more
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {mode === "dashboard" ? (
        <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {selectedDay
                  ? selectedDay.toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                    })
                  : "Select a day"}
              </p>
              <p className="text-xs text-[rgb(var(--subtext))]">
                Personal + project events + deadlines
              </p>
            </div>
          </div>

          {selectedDay ? (
            <>
              {/* CREATE EVENT (only if allowed) */}
              {allowCreate ? (
                <div className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-4">
                  <p className="text-sm font-semibold tracking-tight mb-2">
                    Add personal event
                  </p>

                  <div className="flex flex-col gap-2">
                    <input
                      className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      placeholder="Title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      disabled={creating}
                    />

                    <textarea
                      className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 min-h-[80px]"
                      placeholder="Description (optional)"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      disabled={creating}
                    />

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newAllDay}
                        onChange={(e) => setNewAllDay(e.target.checked)}
                        disabled={creating}
                      />
                      All day
                    </label>

                    {!newAllDay ? (
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[rgb(var(--subtext))]">
                            Start
                          </span>
                          <input
                            type="time"
                            className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                            value={newStartTime}
                            onChange={(e) => setNewStartTime(e.target.value)}
                            disabled={creating}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[rgb(var(--subtext))]">
                            End
                          </span>
                          <input
                            type="time"
                            className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                            value={newEndTime}
                            onChange={(e) => setNewEndTime(e.target.value)}
                            disabled={creating}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition"
                        onClick={createEvent}
                        disabled={creating || !newTitle.trim()}
                      >
                        {creating ? "Adding…" : "Add event"}
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition"
                        onClick={() => {
                          setNewTitle("");
                          setNewDesc("");
                          setNewAllDay(false);
                        }}
                        disabled={creating}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* EVENTS LIST */}
              <div className="mt-3">
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-[rgb(var(--subtext))]">
                    No items for this day.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e) => {
                      const s = toDate(e.start);
                      const en = toDate(e.end);

                      const key = `${e.kind}-${e._id}`;
                      const isEditing = editingKey === key;
                      const isEvent = e.kind === "event";

                      return (
                        <div
                          key={key}
                          className="rounded-2xl border border-[rgb(var(--border))] bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{ backgroundColor: eventDotColor(e) }}
                                />
                                <p className="font-medium truncate">
                                  {e.kind === "task"
                                    ? `📌 ${e.title}`
                                    : e.title}
                                </p>
                              </div>

                              <p className="text-xs text-[rgb(var(--subtext))] mt-1">
                                {e.allDay
                                  ? "All day"
                                  : `${prettyTime(s)}–${prettyTime(en)}`}
                                {e.project?.name ? ` · ${e.project.name}` : ""}
                              </p>
                            </div>

                            {isEvent ? (
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  type="button"
                                  className="text-sm text-[rgb(var(--primary))] hover:underline"
                                  onClick={() => {
                                    setEditingKey(key);
                                    setEditTitle(e.title);
                                    setEditDesc(e.description ?? "");
                                    setEditAllDay(!!e.allDay);
                                    setEditStartTime(timeHHMM(e.start));
                                    setEditEndTime(timeHHMM(e.end));
                                  }}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="text-sm text-red-600 hover:underline"
                                  onClick={async () => {
                                    if (!confirm("Delete this event?")) return;
                                    setError("");
                                    const res = await apiDelete(
                                      eventApiBase(e),
                                    );
                                    if (!res.ok) {
                                      setError("Could not delete event");
                                      return;
                                    }
                                    await load();
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
