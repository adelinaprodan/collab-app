export interface Task {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  assignedTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
