"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/src/lib/api";
import CalendarMonth from "@/src/components/CalendarMonth";

type TaskStatus = "todo" | "doing" | "done";

type UserLite = {
  _id: string;
  name?: string;
  email?: string;
};

type Task = {
  _id: string;
  project: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt?: string;
  updatedAt?: string;

  assignedTo?: UserLite | string | null;
  deadline?: string | null; // ISO string from API
};

type Project = {
  _id: string;
  name: string;
  description?: string;
  joinCode?: string;
  owner?: UserLite;
  members?: UserLite[];
};

type ProjectFile = {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt?: string;
  uploadedBy?: UserLite;
};

const COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: "todo", title: "To do" },
  { key: "doing", title: "Doing" },
  { key: "done", title: "Done" },
];

function userLabel(u: UserLite) {
  return u.name || u.email || u._id;
}

function getAssignedId(a: Task["assignedTo"]): string {
  if (!a) return "";
  if (typeof a === "string") return a;
  return a._id || "";
}

// Convert ISO deadline -> yyyy-mm-dd for <input type="date">
function toDateInputValue(deadline?: string | null) {
  if (!deadline) return "";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// For upload/download where we need Authorization header
async function authFetch(url: string, init?: RequestInit) {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // create task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [deadline, setDeadline] = useState<string>(""); // yyyy-mm-dd
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");

    const pRes = await apiGet<{ project: Project; error?: string }>(
      `/api/projects/${projectId}`,
    );

    if (!pRes.ok) {
      setError(pRes.data.error || "Could not load project");
      setProject(null);
      setTasks([]);
      setFiles([]);
      setLoading(false);
      return;
    }

    setProject(pRes.data.project);

    const tRes = await apiGet<{ tasks: Task[]; error?: string }>(
      `/api/projects/${projectId}/tasks`,
    );
    if (!tRes.ok) {
      setError(tRes.data.error || "Could not load tasks");
      setTasks([]);
    } else {
      setTasks(tRes.data.tasks ?? []);
    }

    const fRes = await apiGet<{ files: ProjectFile[]; error?: string }>(
      `/api/projects/${projectId}/files`,
    );
    if (fRes.ok) setFiles(fRes.data.files ?? []);
    else setFiles([]);

    setLoading(false);
  }

  useEffect(() => {
    if (projectId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  const people = useMemo<UserLite[]>(() => {
    if (!project) return [];
    const all = [
      ...(project.owner ? [project.owner] : []),
      ...(project.members ?? []),
    ].filter(Boolean) as UserLite[];

    const seen = new Set<string>();
    const out: UserLite[] = [];
    for (const u of all) {
      if (!u?._id) continue;
      if (seen.has(u._id)) continue;
      seen.add(u._id);
      out.push(u);
    }
    return out;
  }, [project]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
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
    await loadAll();
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
      await loadAll();
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

  async function handleDeleteProject() {
    if (
      !confirm(
        "Delete this project permanently? This will delete all tasks too.",
      )
    )
      return;

    setError("");

    const res = await apiDelete<{ ok?: boolean; error?: string }>(
      `/api/projects/${projectId}`,
    );

    if (!res.ok) {
      setError(res.data.error || "Could not delete project");
      return;
    }

    window.location.href = "/projects";
  }

  async function leaveProject() {
    setError("");
    const res = await apiPost<{ ok?: boolean; error?: string }>(
      `/api/projects/${projectId}/leave`,
      {},
    );

    if (!res.ok) {
      setError(res.data.error || "Could not leave project");
      return;
    }

    window.location.href = "/projects";
  }

  async function handleUpload(file: File) {
    setError("");
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await authFetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Upload failed");
      setUploading(false);
      return;
    }

    await loadAll();
    setUploading(false);
  }

  // ✅ keep tree: DELETE /api/projects/:id/files/:fileId
  async function deleteFile(fileId: string) {
    setError("");
    const res = await authFetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Could not delete file");
    else await loadAll();
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <p className="text-sm text-[rgb(var(--subtext))]">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <p className="text-sm text-[rgb(var(--subtext))]">Project not found.</p>
      </div>
    );
  }

  const ownerId = project.owner?._id;
  const membersWithoutOwner = (project.members ?? []).filter(
    (m) => m._id !== ownerId,
  );

  return (
    <div className="space-y-6">
      {/* Top / Header */}
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl justify-between gap-4 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {project.name}
              </h1>

              {project.description ? (
                <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
                  {project.description}
                </p>
              ) : null}

              {project.joinCode ? (
                <p className="mt-3 text-sm text-[rgb(var(--subtext))]">
                  Join code:{" "}
                  <span className="font-mono text-[rgb(var(--text))]">
                    {project.joinCode}
                  </span>
                </p>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition"
                onClick={leaveProject}
              >
                Leave project
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                onClick={handleDeleteProject}
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top grid: Members + Create task (left) + Calendar (right) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight">Members</h2>

            <div className="mt-4 space-y-2">
              {project.owner ? (
                <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-white p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {userLabel(project.owner)}
                    </p>
                    {project.owner.email ? (
                      <p className="text-sm text-[rgb(var(--subtext))] truncate">
                        {project.owner.email}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1 text-[11px] text-[rgb(var(--subtext))]">
                    Owner
                  </span>
                </div>
              ) : null}

              {membersWithoutOwner.length === 0 ? (
                <p className="text-sm text-[rgb(var(--subtext))]">
                  No members yet (only you).
                </p>
              ) : (
                membersWithoutOwner.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{userLabel(m)}</p>
                      {m.email ? (
                        <p className="text-sm text-[rgb(var(--subtext))] truncate">
                          {m.email}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1 text-[11px] text-[rgb(var(--subtext))]">
                      Member
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create task (moved here) */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight">
              Add a task
            </h2>

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
                    <option value="todo">To do</option>
                    <option value="doing">Doing</option>
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
        </div>

        {/* Right column: Calendar */}
        <div className="lg:col-span-2">
          <CalendarMonth
            mode="project"
            projectId={projectId}
            title="Project calendar"
            allowCreate={false}
          />
        </div>
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
                    {/* Deadline */}
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

                    {/* Status + Assignee */}
                    <div className="flex flex-wrap items-center gap-3">
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
                          <option value="todo">To do</option>
                          <option value="doing">Doing</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[rgb(var(--subtext))]">
                          Assignee
                        </span>
                        <select
                          className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-1.5 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                          value={getAssignedId(t.assignedTo)}
                          onChange={(e) =>
                            updateTask(t._id, {
                              assignedTo: e.target.value || null,
                            } as any)
                          }
                        >
                          <option value="">Unassigned</option>
                          {people.map((u) => (
                            <option key={u._id} value={u._id}>
                              {userLabel(u)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="ml-auto flex gap-2">
                        {t.status !== "todo" && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-2.5 py-1.5 text-sm hover:bg-[rgb(var(--muted))] transition"
                            onClick={() =>
                              updateTask(t._id, {
                                status: t.status === "done" ? "doing" : "todo",
                              })
                            }
                          >
                            ←
                          </button>
                        )}
                        {t.status !== "done" && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-2.5 py-1.5 text-sm hover:bg-[rgb(var(--muted))] transition"
                            onClick={() =>
                              updateTask(t._id, {
                                status: t.status === "todo" ? "doing" : "done",
                              })
                            }
                          >
                            →
                          </button>
                        )}
                      </div>
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

      {/* Files */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Files</h2>
        <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
          Upload and share project documents.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition">
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.currentTarget.value = "";
              }}
            />
            Choose file
          </label>

          {uploading ? (
            <span className="text-sm text-[rgb(var(--subtext))]">
              Uploading…
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          {files.length === 0 ? (
            <p className="text-sm text-[rgb(var(--subtext))]">No files yet.</p>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div
                  key={f._id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.originalName}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      {(f.size / 1024).toFixed(1)} KB
                      {f.uploadedBy
                        ? ` • uploaded by ${userLabel(f.uploadedBy)}`
                        : ""}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <button
                      className="text-sm text-[rgb(var(--primary))] hover:underline"
                      type="button"
                      onClick={() => {
                        authFetch(
                          `/api/projects/${projectId}/files/${f._id}/download`,
                        ).then(async (r) => {
                          if (!r.ok) return setError("Download failed");
                          const blob = await r.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = f.originalName;
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                      }}
                    >
                      Download
                    </button>

                    <button
                      className="text-sm text-red-600 hover:underline"
                      type="button"
                      onClick={() => deleteFile(f._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
