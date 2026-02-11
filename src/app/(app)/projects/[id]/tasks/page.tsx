"use client";
import { useEffect, useState } from "react";
import { fetchTasks } from "@/src/lib/tasks";
import { apiPatch } from "@/src/lib/api";
import { Task } from "@/src/types/task";
import AddTask from "./AddTask";


export default function TaskBoard({ params }: { params: { id: string } }) {
  const projectId = params.id;

  // FIX: Task[] typing
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  async function load() {
    const data = await fetchTasks(projectId);

    // FIX: ensure array type
    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(taskId: string, status: Task["status"]) {
    setUpdatingTaskId(taskId);
    try {
      await apiPatch(`/api/tasks/${taskId}`, { status });
      await load();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (loading) return <p>Loading tasks...</p>;

  // FIX: fully typed columns
  const columns: Record<"todo" | "in_progress" | "done", Task[]> = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      {(["todo", "in_progress", "done"] as const).map((col) => (
        <div key={col}>
          <h2 className="text-xl font-semibold capitalize mb-4">
            {col.replace("_", " ")}
          </h2>
          <AddTask projectId={projectId} />

          <div className="space-y-4">
            {columns[col].map((task) => (
              <div
                key={task._id}
                className="border p-4 rounded shadow bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{task.title}</h3>
                  <select
                    className="border rounded p-1 text-sm"
                    value={task.status}
                    disabled={updatingTaskId === task._id}
                    onChange={(e) =>
                      handleStatusChange(task._id, e.target.value as Task["status"])
                    }
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}

                {/*{"deadline" in task && task.deadline && (
                  <p className="text-xs text-gray-500 mt-2">
                    Deadline: {new Date(task.deadline).toLocaleDateString()}
                  </p>
                )}*/}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
