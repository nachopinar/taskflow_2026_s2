import type { Priority, Status, User } from '@client/types';

// Los tipos del dominio (Task, Project, Comment, Priority...) se importan de
// '@client/types', la misma fuente que usa la app. Acá van solo los propios de la suite.

/** Usuario registrado por la suite, con lo necesario para operar en su nombre. */
export interface Account {
  user: User;
  password: string;
  token: string;
}

/** Cuerpo de POST /projects/:id/tasks. */
export interface NewTask {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

/** Cuerpo de PATCH /tasks/:id. */
export type TaskUpdate = Partial<NewTask> & { status?: Status };
