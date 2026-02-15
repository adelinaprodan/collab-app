"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch, apiPost } from "@/src/lib/api";
import { useParams } from "next/navigation";

type Task = { _id: string; title: string; status?: string };
type ProjectFile = { _id: string; originalName: string };
type NoteLite = { _id: string; title: string };

type Note = {
  _id: string;
  projectId: string;
  title: string;
  content: string;
  linkedTasks?: (Task | string)[];
  linkedFiles?: (ProjectFile | string)[];
  linkedNotes?: (NoteLite | string)[];
  createdAt?: string;
  updatedAt?: string;
};

function toIdArray(list: any[] | undefined) {
  if (!Array.isArray(list)) return [];
  return list.map((x) => (typeof x === "string" ? x : x?._id)).filter(Boolean);
}

export default function NoteDetailPage() {
  const params = useParams<{ id: string; noteId: string }>();
  const projectId = params.id;
  const noteId = params.noteId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [note, setNote] = useState<Note | null>(null);

  // Link sources
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [allNotes, setAllNotes] = useState<NoteLite[]>([]);

  // Editable fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [linkedFileIds, setLinkedFileIds] = useState<string[]>([]);
  const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);

  async function loadAll() {
    setLoading(true);
    setError("");

    const nRes = await apiPost<{ note?: Note; error?: string }>(
      "/api/notes/get",
      {
        noteId,
      },
    );

    if (!nRes.ok || !nRes.data.note) {
      setError(nRes.data.error || "Could not load note");
      setNote(null);
      setLoading(false);
      return;
    }

    const loaded = nRes.data.note;
    setNote(loaded);
    setTitle(loaded.title || "");
    setContent(loaded.content || "");

    setLinkedTaskIds(toIdArray(loaded.linkedTasks));
    setLinkedFileIds(toIdArray(loaded.linkedFiles));
    setLinkedNoteIds(
      toIdArray(loaded.linkedNotes).filter((id) => id !== noteId),
    );

    // Sources for linking
    const tRes = await apiGet<{ tasks: Task[] }>(
      `/api/projects/${projectId}/tasks`,
    );
    setTasks(tRes.ok && Array.isArray(tRes.data.tasks) ? tRes.data.tasks : []);

    const fRes = await apiGet<{ files: ProjectFile[] }>(
      `/api/projects/${projectId}/files`,
    );
    setFiles(fRes.ok && Array.isArray(fRes.data.files) ? fRes.data.files : []);

    const listRes = await apiPost<{ notes: NoteLite[] }>("/api/notes/list", {
      projectId,
    });
    const lite =
      listRes.ok && Array.isArray(listRes.data.notes)
        ? listRes.data.notes.map((x: any) => ({ _id: x._id, title: x.title }))
        : [];
    setAllNotes(lite.filter((x) => x._id !== noteId));

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, noteId]);

  async function save() {
    setSaving(true);
    setError("");

    const res = await apiPatch<{ note?: Note; error?: string }>(
      "/api/notes/update",
      {
        noteId,
        title,
        content,
        linkedTasks: linkedTaskIds,
        linkedFiles: linkedFileIds,
        linkedNotes: linkedNoteIds,
      },
    );

    if (!res.ok) {
      setError(res.data.error || "Could not save note");
      setSaving(false);
      return;
    }

    await loadAll();
    setSaving(false);
  }

  const canRender = !loading && note;

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <p className="text-sm text-[rgb(var(--subtext))]">Loading note…</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <p className="text-sm text-red-600">{error || "Note not found."}</p>
          <Link
            href={`/projects/${projectId}/notes`}
            className="mt-3 inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition"
          >
            Back to notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Note</h1>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Update content and linked items.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${projectId}/notes`}
            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition"
          >
            Back to notes
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Main editor */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-3">
        <input
          className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="min-h-[220px] w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Linking */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            Linked tasks
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Select tasks this note refers to.
          </p>

          <div className="mt-4 grid gap-2">
            {tasks.length === 0 ? (
              <p className="text-sm text-[rgb(var(--subtext))]">
                No tasks found.
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
                      onChange={() =>
                        setLinkedTaskIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== t._id)
                            : [...prev, t._id],
                        )
                      }
                    />
                    <span className="truncate">{t.title}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Files */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            Linked files
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Select files this note explains or references.
          </p>

          <div className="mt-4 grid gap-2">
            {files.length === 0 ? (
              <p className="text-sm text-[rgb(var(--subtext))]">
                No files found.
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
                      onChange={() =>
                        setLinkedFileIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== f._id)
                            : [...prev, f._id],
                        )
                      }
                    />
                    <span className="truncate">{f.originalName}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Link notes to notes */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Linked notes</h2>
        <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
          Link related notes (idea chains, references, expansions).
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allNotes.length === 0 ? (
            <p className="text-sm text-[rgb(var(--subtext))]">
              No other notes yet.
            </p>
          ) : (
            allNotes.map((n) => {
              const checked = linkedNoteIds.includes(n._id);
              return (
                <label
                  key={n._id}
                  className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setLinkedNoteIds((prev) =>
                        checked
                          ? prev.filter((id) => id !== n._id)
                          : [...prev, n._id],
                      )
                    }
                  />
                  <span className="truncate">{n.title}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
