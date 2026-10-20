export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Account {
  user: User;
  password: string;
  token: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  tags?: Array<{ id: string; name: string }>;
}

export interface Comment {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export interface NewTask {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export type TaskUpdate = Partial<NewTask> & { status?: Status };
