"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/src/lib/api";
import { useParams } from "next/navigation";
type TaskStatus = "todo" | "doing" | "done" | "in_progress"; // support both, your codebase has mixed types

type Task = {
  _id: string;
  title: string;
  status?: TaskStatus;
};

type ProjectFile = {
  _id: string;
  originalName: string;
};

type UserLite = { _id: string; name?: string; email?: string };

type Note = {
  _id: string;
  projectId: string;
  title: string;
  content: string;
  createdBy?: UserLite;
  linkedTasks?: Task[] | string[];
  linkedFiles?: ProjectFile[] | string[];
  linkedNotes?: string[];
  createdAt?: string;
  updatedAt?: string;
};

function countLinks(arr: any[] | undefined) {
  return Array.isArray(arr) ? arr.length : 0;
}

export default function ProjectNotesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");

  // For linking UI
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  // Create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [linkedFileIds, setLinkedFileIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");

    const nRes = await apiPost<{ notes: Note[]; error?: string }>(
      "/api/notes/list",
      { projectId },
    );

    if (!nRes.ok) {
      setError(nRes.data.error || "Could not load notes");
      setNotes([]);
    } else {
      setNotes(Array.isArray(nRes.data.notes) ? nRes.data.notes : []);
    }

    // Tasks + files for linking
    const tRes = await apiGet<{ tasks: Task[]; error?: string }>(
      `/api/projects/${projectId}/tasks`,
    );
    setTasks(tRes.ok && Array.isArray(tRes.data.tasks) ? tRes.data.tasks : []);

    const fRes = await apiGet<{ files: ProjectFile[]; error?: string }>(
      `/api/projects/${projectId}/files`,
    );
    setFiles(fRes.ok && Array.isArray(fRes.data.files) ? fRes.data.files : []);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const res = await apiPost<{ note?: Note; error?: string }>(
      "/api/notes/create",
      {
        projectId,
        title,
        content,
        linkedTasks: linkedTaskIds,
        linkedFiles: linkedFileIds,
        linkedNotes: [],
      },
    );

    if (!res.ok) {
      setError(res.data.error || "Could not create note");
      setCreating(false);
      return;
    }

    setTitle("");
    setContent("");
    setLinkedTaskIds([]);
    setLinkedFileIds([]);
    await loadAll();
    setCreating(false);
  }

  const hasNotes = notes.length > 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <p className="text-sm text-[rgb(var(--subtext))]">Loading notes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Project Notes
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Create notes and link them to tasks/files so knowledge doesn’t get
            lost.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium text-[rgb(var(--text))] hover:bg-[rgb(var(--muted))] transition"
        >
          Back to project
        </Link>
      </div>

      {/* Create */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">
          Create a note
        </h2>

        <form onSubmit={handleCreate} className="mt-4 grid gap-3">
          <input
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={creating}
          />

          <textarea
            className="min-h-[120px] w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
            placeholder="Write your note… (meeting minutes, decisions, ideas, explanations)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={creating}
          />

          {/* Link tasks */}
          <div className="grid gap-2">
            <div className="text-sm font-medium text-[rgb(var(--text))]">
              Link tasks (optional)
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-[rgb(var(--subtext))]">
                  No tasks found (you can still create the note).
                </p>
              ) : (
                tasks.map((t) => {
                  const checked = linkedTaskIds.includes(t._id);
                  return (
                    <label
                      key={t._id}
                      className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setLinkedTaskIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== t._id)
                              : [...prev, t._id],
                          );
                        }}
                      />
                      <span className="truncate">{t.title}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Link files */}
          <div className="grid gap-2">
            <div className="text-sm font-medium text-[rgb(var(--text))]">
              Link files (optional)
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {files.length === 0 ? (
                <p className="text-sm text-[rgb(var(--subtext))]">
                  No files uploaded (you can still create the note).
                </p>
              ) : (
                files.map((f) => {
                  const checked = linkedFileIds.includes(f._id);
                  return (
                    <label
                      key={f._id}
                      className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setLinkedFileIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== f._id)
                              : [...prev, f._id],
                          );
                        }}
                      />
                      <span className="truncate">{f.originalName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create note"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </div>

      {/* Notes list */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">All notes</h2>
          <span className="text-xs text-[rgb(var(--subtext))]">
            {notes.length} total
          </span>
        </div>

        {!hasNotes ? (
          <p className="mt-3 text-sm text-[rgb(var(--subtext))]">
            No notes yet — create the first one above.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <Link
                key={n._id}
                href={`/projects/${projectId}/notes/${n._id}`}
                className="group rounded-2xl border border-[rgb(var(--border))] bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold tracking-tight line-clamp-2">
                    {n.title}
                  </h3>
                  <span className="text-xs text-[rgb(var(--subtext))] opacity-0 group-hover:opacity-100 transition">
                    Open →
                  </span>
                </div>

                <p className="mt-2 text-sm text-[rgb(var(--subtext))] line-clamp-3">
                  {n.content || "—"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[rgb(var(--subtext))]">
                  <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1">
                    🔗 Tasks: {countLinks(n.linkedTasks as any)}
                  </span>
                  <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1">
                    📄 Files: {countLinks(n.linkedFiles as any)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
