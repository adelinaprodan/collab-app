"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/src/lib/api";

type Project = {
  _id: string;
  name: string;
  description?: string;
  joinCode?: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // create
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // join
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  async function load() {
    setLoading(true);
    const res = await apiGet<{ projects: Project[] }>("/api/projects");
    setProjects(res.data.projects ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    setJoinError("");
    setJoinSuccess("");
    setCreating(true);

    const res = await apiPost<{ project?: Project; error?: string }>(
      "/api/projects",
      { name, description },
    );

    if (!res.ok) {
      setCreateError(res.data.error || "Could not create project");
      setCreating(false);
      return;
    }

    setName("");
    setDescription("");
    await load();
    setCreating(false);
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoinError("");
    setJoinSuccess("");
    setJoining(true);

    const res = await apiPost<{ error?: string }>("/api/projects/join", {
      joinCode,
    });

    if (!res.ok) {
      setJoinError(res.data.error || "Invalid join code");
      setJoining(false);
      return;
    }

    setJoinCode("");
    setJoinSuccess("Successfully joined the project.");
    await load();
    setJoining(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your Projects
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Join a workspace or create a new one for your student team.
          </p>
        </div>
      </div>

      {/* Join + Create side-by-side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Join */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            Join a project
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Paste a join code to join an existing workspace.
          </p>

          <form onSubmit={handleJoin} className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
              placeholder="Join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              disabled={joining}
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition disabled:opacity-60"
              disabled={joining}
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </form>

          {joinError ? (
            <p className="mt-3 text-sm text-red-600">{joinError}</p>
          ) : null}
          {joinSuccess ? (
            <p className="mt-3 text-sm text-green-600">{joinSuccess}</p>
          ) : null}
        </div>

        {/* Create */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            Create a new project
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Start a workspace with tasks, files and calendar events.
          </p>

          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={creating}
            />


            {createError ? (
              <p className="text-sm text-red-600">{createError}</p>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[rgb(var(--primary-700))] active:scale-[0.99] transition disabled:opacity-60"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create"}
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition disabled:opacity-60"
                onClick={() => {
                  setName("");
                  setDescription("");
                  setCreateError("");
                }}
                disabled={creating}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Projects list BELOW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Your workspaces
          </h2>
          <p className="text-sm text-[rgb(var(--subtext))]">
            {loading ? "Loading…" : `${projects.length} total`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <p className="text-sm text-[rgb(var(--subtext))]">
              Loading projects…
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <p className="text-sm text-[rgb(var(--subtext))]">
              No projects yet. Create one or join using a code.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((p) => (
              <Link
                key={p._id}
                href={`/projects/${p._id}`}
                className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight group-hover:text-[rgb(var(--primary))] transition">
                    {p.name}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-0.5 text-[11px] text-[rgb(var(--subtext))]">
                    Project
                  </span>
                </div>

                {p.description ? (
                  <p className="mt-2 text-sm text-[rgb(var(--subtext))] line-clamp-3">
                    {p.description}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[rgb(var(--subtext))]">
                    No description provided.
                  </p>
                )}

                {p.joinCode ? (
                  <div className="mt-4 text-xs text-[rgb(var(--subtext))]">
                    Join code:{" "}
                    <span className="font-mono text-[rgb(var(--text))]">
                      {p.joinCode}
                    </span>
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
