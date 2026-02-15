"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/src/lib/api";

type UserLite = { _id: string; name?: string; email?: string };

type ProjectFile = {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt?: string;
  uploadedBy?: UserLite;
};

function userLabel(u: UserLite) {
  return u.name || u.email || u._id;
}

function prettyDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

// For upload/download/delete where we need Authorization header
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

export default function ProjectFilesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadFiles() {
    if (!projectId) return;
    setLoading(true);
    setError("");

    const res = await apiGet<{ files: ProjectFile[]; error?: string }>(
      `/api/projects/${projectId}/files`,
    );

    if (!res.ok) {
      setFiles([]);
      setError(res.data.error || "Could not load files");
      setLoading(false);
      return;
    }

    setFiles(res.data.files ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleUpload(file: File) {
    if (!projectId) return;
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

    await loadFiles();
    setUploading(false);
  }

  async function deleteFile(fileId: string) {
    if (!projectId) return;
    setError("");

    const res = await authFetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) setError(data.error || "Could not delete file");
    else await loadFiles();
  }

  async function downloadFile(file: ProjectFile) {
    if (!projectId) return;
    setError("");

    const r = await authFetch(
      `/api/projects/${projectId}/files/${file._id}/download`,
    );

    if (!r.ok) {
      setError("Download failed");
      return;
    }

    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.originalName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
            Upload, download and manage project documents.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--muted))] transition"
          >
            ← Overview
          </Link>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Upload</h2>
        <p className="mt-1 text-sm text-[rgb(var(--subtext))]">
          Share slides, PDFs, images, or any other resources.
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

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">All files</h2>
          <p className="text-sm text-[rgb(var(--subtext))]">
            {loading ? "Loading…" : `${files.length} total`}
          </p>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-[rgb(var(--subtext))]">Loading files…</p>
          ) : files.length === 0 ? (
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
                      {f.createdAt ? ` • ${prettyDate(f.createdAt)}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <button
                      className="text-sm text-[rgb(var(--primary))] hover:underline"
                      type="button"
                      onClick={() => downloadFile(f)}
                    >
                      Download
                    </button>

                    <button
                      className="text-sm text-red-600 hover:underline"
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this file?")) deleteFile(f._id);
                      }}
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
