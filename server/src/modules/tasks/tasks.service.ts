import { badRequest, forbidden, notFound } from '../../lib/http';
import { formatDueDate, parseDueDate, parsePublicId, toPublicId } from '../../lib/ids';
import {
  assertOptionalString,
  assertPriority,
  assertStatus,
  assertString,
  ADMIN,
  OWNER,
  Status,
  toStatus,
} from '../../lib/validation';
import { isMember } from '../../middleware/membership';
import * as repo from './tasks.repository';
import { assertTransition } from './transitions';

export interface TaskRow {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeTask(t: TaskRow, extra: Record<string, unknown> = {}) {
  return {
    id: toPublicId('task', t.id),
    projectId: toPublicId('proj', t.projectId),
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId === null ? null : toPublicId('user', t.assigneeId),
    dueDate: formatDueDate(t.dueDate),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    ...extra,
  };
}

export async function listTasks(projectId: number, filters: repo.TaskFilters) {
  const rows = await repo.findTasks(projectId, filters);

  const items = [];
  for (const row of rows) {
    const assignee = row.assigneeId ? await repo.findUserById(row.assigneeId) : null;
    const commentCount = await repo.countComments(row.id);
    items.push(
      serializeTask(row as TaskRow, {
        assignee: assignee ? { id: toPublicId('user', assignee.id), email: assignee.email } : null,
        commentCount,
      }),
    );
  }

  return items;
}

export async function getTask(taskId: number) {
  const task = await repo.findById(taskId);
  if (!task) throw notFound('Task not found');
  return serializeTask(task, { tags: await listTags(taskId) });
}

export async function createTask(projectId: number, userId: number, body: Record<string, unknown>) {
  const title = assertString(body.title, 'title', 3, 200);
  const description = assertOptionalString(body.description, 'description', 500);
  const priority = body.priority === undefined ? 'MEDIUM' : assertPriority(body.priority);

  let assigneeId: number | null = null;
  if (body.assigneeId !== undefined && body.assigneeId !== null) {
    const parsed = parsePublicId(body.assigneeId, 'user');
    if (parsed === null) throw badRequest('assigneeId must be a valid user id');
    if (!(await isMember(parsed, projectId))) {
      throw badRequest('The assignee must be a member of the project');
    }
    assigneeId = parsed;
  }

  const dueDate = body.dueDate === undefined ? undefined : parseDueDate(body.dueDate);
  if (dueDate === undefined && body.dueDate !== undefined) {
    throw badRequest('dueDate must be a calendar date in YYYY-MM-DD format');
  }

  const task = await repo.insert({
    ...(body as object),
    projectId,
    title,
    description: description ?? null,
    priority,
    assigneeId,
    dueDate: dueDate ?? null,
  } as never);

  await repo.insertHistory({
    taskId: task.id,
    changedById: userId,
    fromStatus: null,
    toStatus: task.status,
  });

  return serializeTask(task);
}

/**
 * Actualiza una tarea: valida los campos recibidos, aplica las reglas de
 * autorización, resuelve la transición de estado, escribe el historial y
 * devuelve la tarea serializada.
 */
export async function updateTask(taskId: number, userId: number, body: Record<string, unknown>) {
  const task = await repo.findById(taskId);
  if (!task) throw notFound('Task not found');

  const data: Record<string, unknown> = {};
  let nextStatus: Status | null = null;

  if (body.title !== undefined) {
    data.title = assertString(body.title, 'title', 3, 200);
  }

  if (body.description !== undefined) {
    const description = assertOptionalString(body.description, 'description', 500);
    data.description = description ?? null;
  }

  if (body.priority !== undefined) {
    data.priority = assertPriority(body.priority);
  }

  if (body.dueDate !== undefined) {
    const parsed = parseDueDate(body.dueDate);
    if (parsed === undefined) {
      throw badRequest('dueDate must be a calendar date in YYYY-MM-DD format');
    }
    data.dueDate = parsed;
  }

  if (body.assigneeId !== undefined) {
    if (body.assigneeId === null) {
      data.assigneeId = null;
    } else {
      const parsed = parsePublicId(body.assigneeId, 'user');
      if (parsed === null) {
        throw badRequest('assigneeId must be a valid user id');
      } else {
        const memberOfProject = await isMember(parsed, task.projectId);
        if (!memberOfProject) {
          throw badRequest('The assignee must be a member of the project');
        } else {
          data.assigneeId = parsed;
        }
      }
    }
  }

  if (body.status !== undefined) {
    const requested = assertStatus(body.status);
    if (requested !== task.status) {
      const isAssignee = task.assigneeId === userId;
      if (!isAssignee) {
        const membership = await repo.findMembership(task.projectId, userId);
        if (!membership) {
          throw forbidden('Only the assignee or a project admin can change the status');
        } else if (membership.role !== OWNER && membership.role !== ADMIN) {
          throw forbidden('Only the assignee or a project admin can change the status');
        } else {
          assertTransition(toStatus(task.status), requested);
          nextStatus = requested;
        }
      } else {
        assertTransition(toStatus(task.status), requested);
        nextStatus = requested;
      }
    }
  }

  if (nextStatus !== null) {
    data.status = nextStatus;
  }

  if (Object.keys(data).length === 0) {
    return serializeTask(task);
  }

  const updated = await repo.updateById(taskId, data);

  if (nextStatus !== null) {
    await repo.insertHistory({
      taskId,
      changedById: userId,
      fromStatus: task.status,
      toStatus: nextStatus,
    });
  }

  return serializeTask(updated);
}

export async function deleteTask(taskId: number): Promise<void> {
  const task = await repo.findById(taskId);
  if (!task) throw notFound('Task not found');

  await repo.removeWithRelations(taskId);
}

const MAX_TAGS_PER_TASK = 10;

export async function addTag(taskId: number, rawName: unknown) {
  if (typeof rawName !== 'string' || rawName.trim().length < 1 || rawName.trim().length > 30) {
    throw badRequest('Tag name must be between 1 and 30 characters');
  }
  const name = rawName.trim();

  const current = await repo.countTags(taskId);
  if (current >= MAX_TAGS_PER_TASK) {
    throw badRequest(`A task can have at most ${MAX_TAGS_PER_TASK} tags`);
  }

  let tag = await repo.findTagByName(name);
  if (!tag) tag = await repo.insertTag(name);

  await repo.insertTaskTag(taskId, tag.id);

  return { id: toPublicId('tag', tag.id), name: tag.name };
}

export async function removeTag(taskId: number, tagId: number): Promise<void> {
  const link = await repo.findTaskTag(taskId, tagId);
  if (!link) throw notFound('The task does not have that tag');
  await repo.removeTaskTagById(link.id);
}

export async function listTags(taskId: number) {
  const links = await repo.listTaskTags(taskId);
  return links.map((l) => ({ id: toPublicId('tag', l.tag.id), name: l.tag.name }));
}

export async function listHistory(taskId: number) {
  const rows = await repo.listHistory(taskId);
  return rows.map((r) => ({
    id: r.id,
    taskId: toPublicId('task', r.taskId),
    changedBy: toPublicId('user', r.changedById),
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    changedAt: r.changedAt.toISOString(),
  }));
}
