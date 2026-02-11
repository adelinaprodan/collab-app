import { apiGet } from "@/src/lib/api";

export async function fetchTasks(projectId: string) {
  const res = await apiGet<{ tasks: unknown }>(`/api/projects/${projectId}/tasks`);
  return res.data;
}
