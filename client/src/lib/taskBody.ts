import type { TaskFieldValues } from '../components/task/TaskFields';

/** Cuerpo para crear una tarea: omite los campos opcionales vacíos. */
export function toCreateBody(values: TaskFieldValues): Record<string, unknown> {
  const { title, description, priority, assigneeId, dueDate } = values;
  const body: Record<string, unknown> = { title };
  if (description) body.description = description;
  if (priority) body.priority = priority;
  if (assigneeId) body.assigneeId = assigneeId;
  if (dueDate) body.dueDate = dueDate;
  return body;
}

/** Cuerpo para actualizar una tarea: envía `null` en los campos opcionales vacíos. */
export function toUpdateBody(values: TaskFieldValues): Record<string, unknown> {
  const { title, description, priority, assigneeId, dueDate } = values;
  return {
    title,
    description: description === '' ? null : description,
    priority,
    assigneeId: assigneeId === '' ? null : assigneeId,
    dueDate: dueDate === '' ? null : dueDate,
  };
}
