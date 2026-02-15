"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/src/lib/api";

type TaskStatus = "todo" | "doing" | "done";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  deadline?: string | null;
  assignedTo?: any;
};

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: "todo", title: "Todo" },
  { key: "doing", title: "In Progress" },
  { key: "done", title: "Done" },
];

function toDateInputValue(deadline?: string | null) {
  if (!deadline) return "";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TaskBoard() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // create task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [deadline, setDeadline] = useState<string>(""); // yyyy-mm-dd
  const [creating, setCreating] = useState(false);

  async function loadTasks() {
    if (!projectId) return;
    setLoading(true);
    setError("");

    const tRes = await apiGet<{ tasks: Task[]; error?: string }>(
      `/api/projects/${projectId}/tasks`,
    );

    if (!tRes.ok) {
      setError(tRes.data.error || "Could not load tasks");
      setTasks([]);
    } else {
      setTasks(tRes.data.tasks ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;

    setError("");
    setCreating(true);

    const res = await apiPost<{ task?: Task; error?: string }>(
      `/api/projects/${projectId}/tasks`,
      { title, description, status, deadline: deadline || null },
    );

    if (!res.ok) {
      setError(res.data.error || "Could not create task");
      setCreating(false);
      return;
    }

    setTitle("");
    setDescription("");
    setStatus("todo");
    setDeadline("");
    await loadTasks();
    setCreating(false);
  }

  async function updateTask(taskId: string, patch: Partial<Task>) {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, ...patch } : t)),
    );

    const res = await apiPatch<{ task?: Task; error?: string }>(
      `/api/tasks/${taskId}`,
      patch as any,
    );

    if (!res.ok) {
      await loadTasks();
      setError(res.data.error || "Could not update task");
    } else if (res.data.task) {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.data.task! : t)),
      );
    }
  }

  async function deleteTask(taskId: string) {
    const before = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));

    const res = await apiDelete<{ ok?: boolean; error?: string }>(
      `/api/tasks/${taskId}`,
    );

    if (!res.ok) {
      setTasks(before);
      setError(res.data.error || "Could not delete task");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <p className="text-sm text-[rgb(var(--subtext))]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Task board</h1>
        <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
          Manage tasks by status.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {/* Create task */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Add a task</h2>

        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={creating}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[rgb(var(--subtext))]">
                Deadline (optional)
              </label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={creating}
              />
            </div>

            <div>
              <label className="text-xs text-[rgb(var(--subtext))]">
                Status
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={creating}
              >
                <option value="todo">Todo</option>
                <option value="doing">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <textarea
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 min-h-[96px]"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={creating}
          />

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition disabled:opacity-60"
            disabled={creating}
          >
            {creating ? "Adding…" : "Add task"}
          </button>
        </form>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
              <h3 className="text-sm font-semibold tracking-tight">
                {col.title}
              </h3>
              <span className="text-xs text-[rgb(var(--subtext))]">
                {tasksByStatus[col.key].length}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {tasksByStatus[col.key].map((t) => (
                <div
                  key={t._id}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.title}</p>
                      {t.description ? (
                        <p className="mt-1 text-sm text-[rgb(var(--subtext))] whitespace-pre-wrap">
                          {t.description}
                        </p>
                      ) : null}
                    </div>

                    <button
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => deleteTask(t._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[rgb(var(--subtext))]">
                        Deadline
                      </span>
                      <input
                        type="date"
                        className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-1.5 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                        value={toDateInputValue(t.deadline)}
                        onChange={(e) =>
                          updateTask(t._id, {
                            deadline: e.target.value || null,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[rgb(var(--subtext))]">
                        Status
                      </span>
                      <select
                        className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-1.5 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                        value={t.status}
                        onChange={(e) =>
                          updateTask(t._id, {
                            status: e.target.value as TaskStatus,
                          })
                        }
                      >
                        <option value="todo">Todo</option>
                        <option value="doing">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {tasksByStatus[col.key].length === 0 ? (
                <p className="text-sm text-[rgb(var(--subtext))]">
                  No tasks here.
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
