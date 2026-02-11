"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddTask({ projectId }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description }),
    });

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-6">
      <input
        className="w-full p-2 border rounded"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full p-2 border rounded"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button className="px-4 py-2 bg-blue-600 text-white rounded">
        Add Task
      </button>
    </form>
  );
}
