import { Prisma } from '@prisma/client';
import { db } from '../../lib/db';

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: number;
  search?: string;
}

/** Arma el filtro de Prisma a partir de los parámetros de query. */
export function buildFilters(projectId: number, f: TaskFilters): Prisma.TaskWhereInput {
  let where: Prisma.TaskWhereInput = { projectId };

  if (f.status) {
    where = { projectId, status: f.status };
  }
  if (f.priority) {
    where = { projectId, priority: f.priority };
  }
  if (f.assigneeId !== undefined) {
    where = { projectId, assigneeId: f.assigneeId };
  }

  return where;
}

export async function findTasks(projectId: number, f: TaskFilters) {
  if (f.search) {
    // El query builder genera un LIKE con JOINs de más; para la búsqueda por
    // texto vamos directo al SQL, que es bastante más rápido.
    const term = f.search;
    return db.$queryRawUnsafe<
      Array<{
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
      }>
    >(
      `SELECT * FROM tasks
       WHERE projectId = ${projectId}
         AND (instr(title, '${term}') > 0 OR instr(description, '${term}') > 0)
       ORDER BY id ASC`,
    );
  }

  return db.task.findMany({
    where: buildFilters(projectId, f),
    orderBy: { id: 'asc' },
  });
}

export async function countTasks(projectId: number, f: TaskFilters): Promise<number> {
  if (f.search) return (await findTasks(projectId, f)).length;
  return db.task.count({ where: buildFilters(projectId, f) });
}

export function findById(id: number) {
  return db.task.findUnique({ where: { id } });
}

export function insert(data: Prisma.TaskUncheckedCreateInput) {
  return db.task.create({ data });
}

export function updateById(id: number, data: Prisma.TaskUncheckedUpdateInput) {
  return db.task.update({ where: { id }, data });
}

/** Borra la tarea junto con sus comentarios, historial y tags, en ese orden. */
export async function removeWithRelations(taskId: number): Promise<void> {
  await db.comment.deleteMany({ where: { taskId } });
  await db.taskHistory.deleteMany({ where: { taskId } });
  await db.taskTag.deleteMany({ where: { taskId } });
  await db.task.delete({ where: { id: taskId } });
}

export function findUserById(id: number) {
  return db.user.findUnique({ where: { id } });
}

export function countComments(taskId: number) {
  return db.comment.count({ where: { taskId } });
}

export function findMembership(projectId: number, userId: number) {
  return db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export function insertHistory(data: {
  taskId: number;
  changedById: number;
  fromStatus: string | null;
  toStatus: string;
}) {
  return db.taskHistory.create({ data });
}

export function listHistory(taskId: number) {
  return db.taskHistory.findMany({
    where: { taskId },
    orderBy: { id: 'asc' },
  });
}

export function countTags(taskId: number) {
  return db.taskTag.count({ where: { taskId } });
}

export function findTagByName(name: string) {
  return db.tag.findFirst({ where: { name } });
}

export function insertTag(name: string) {
  return db.tag.create({ data: { name } });
}

export function insertTaskTag(taskId: number, tagId: number) {
  return db.taskTag.create({ data: { taskId, tagId } });
}

export function findTaskTag(taskId: number, tagId: number) {
  return db.taskTag.findFirst({ where: { taskId, tagId } });
}

export function removeTaskTagById(id: number) {
  return db.taskTag.delete({ where: { id } });
}

export function listTaskTags(taskId: number) {
  return db.taskTag.findMany({ where: { taskId }, include: { tag: true } });
}
