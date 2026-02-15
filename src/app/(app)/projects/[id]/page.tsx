"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiDelete, apiGet, apiPost } from "@/src/lib/api";
import CalendarMonth from "@/src/components/CalendarMonth";

type TaskStatus = "todo" | "doing" | "done";

type UserLite = { _id: string; name?: string; email?: string };

type Project = {
  _id: string;
  name: string;
  description?: string;
  joinCode?: string;
  owner?: UserLite;
  members?: UserLite[];
};

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  deadline?: string | null;
  assignedTo?: UserLite | string | null;
};

type ProjectFile = {
  _id: string;
  originalName: string;
  size: number;
  createdAt?: string;
  uploadedBy?: UserLite;
};

type NoteLite = {
  _id: string;
  title: string;
  content?: string;
  updatedAt?: string;
};

function userLabel(u: UserLite) {
  return u.name || u.email || u._id;
}

function prettyDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [notes, setNotes] = useState<NoteLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");

    const pRes = await apiGet<{ project: Project; error?: string }>(
      `/api/projects/${projectId}`,
    );
    if (!pRes.ok) {
      setError(pRes.data.error || "Could not load project");
      setProject(null);
      setLoading(false);
      return;
    }
    setProject(pRes.data.project);

    const tRes = await apiGet<{ tasks: Task[]; error?: string }>(
      `/api/projects/${projectId}/tasks`,
    );
    setTasks(tRes.ok ? (tRes.data.tasks ?? []) : []);

    const fRes = await apiGet<{ files: ProjectFile[]; error?: string }>(
      `/api/projects/${projectId}/files`,
    );
    setFiles(fRes.ok ? (fRes.data.files ?? []) : []);

    const nRes = await apiPost<{ notes: NoteLite[]; error?: string }>(
      `/api/notes/list`,
      { projectId },
    );
    setNotes(nRes.ok ? (nRes.data.notes ?? []) : []);

    setLoading(false);
  }

  useEffect(() => {
    if (projectId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
    router.push("/projects");
  }

  async function deleteProject() {
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
    router.push("/projects");
  }

  const upcomingTasks = useMemo(() => {
    // show todo + doing only; prioritize deadline soon; show max 6
    const filtered = tasks.filter((t) => t.status !== "done");
    filtered.sort((a, b) => {
      const ad = a.deadline
        ? new Date(a.deadline).getTime()
        : Number.POSITIVE_INFINITY;
      const bd = b.deadline
        ? new Date(b.deadline).getTime()
        : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return filtered.slice(0, 6);
  }, [tasks]);

  const recentNotes = useMemo(() => (notes ?? []).slice(0, 4), [notes]);
  const recentFiles = useMemo(() => (files ?? []).slice(0, 4), [files]);

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
      {/* Header */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
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
              onClick={deleteProject}
            >
              Delete project
            </button>
          </div>
        </div>
      </div>

      {/* Top grid: Members + Quick snapshots */}
      <div className="grid gap-6 lg:grid-cols-3">
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
                No members yet.
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

        {/* Upcoming tasks */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Upcoming tasks
            </h2>
            <Link
              href={`/projects/${projectId}/tasks`}
              className="text-sm text-[rgb(var(--primary))] hover:underline"
            >
              Open →
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-[rgb(var(--subtext))]">
                No upcoming tasks (or everything is done 🎉).
              </p>
            ) : (
              upcomingTasks.map((t) => (
                <div
                  key={t._id}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium truncate">{t.title}</p>
                    <span className="text-xs text-[rgb(var(--subtext))]">
                      {t.status === "doing" ? "Doing" : "Todo"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--subtext))]">
                    {t.deadline
                      ? `Deadline: ${prettyDate(t.deadline)}`
                      : "No deadline"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent notes */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Recent notes
            </h2>
            <Link
              href={`/projects/${projectId}/notes`}
              className="text-sm text-[rgb(var(--primary))] hover:underline"
            >
              Open →
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-[rgb(var(--subtext))]">
                No notes yet — add the first one in Notes.
              </p>
            ) : (
              recentNotes.map((n) => (
                <Link
                  key={n._id}
                  href={`/projects/${projectId}/notes/${n._id}`}
                  className="block rounded-2xl border border-[rgb(var(--border))] bg-white p-3 hover:bg-[rgb(var(--muted))] transition"
                >
                  <p className="font-medium truncate">{n.title}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--subtext))] line-clamp-2">
                    {n.content || "—"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Calendar (keep this!) */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <CalendarMonth
          mode="project"
          projectId={projectId}
          title="Project calendar"
          allowCreate={false}
        />
      </div>

      {/* Recent files */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Recent files
          </h2>
          <Link
            href={`/projects/${projectId}/files`}
            className="text-sm text-[rgb(var(--primary))] hover:underline"
          >
            Open →
          </Link>
        </div>

        <div className="mt-4">
          {recentFiles.length === 0 ? (
            <p className="text-sm text-[rgb(var(--subtext))]">No files yet.</p>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <div
                  key={f._id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.originalName}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--subtext))]">
                      {(f.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span className="text-xs text-[rgb(var(--subtext))]">
                    {prettyDate(f.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
