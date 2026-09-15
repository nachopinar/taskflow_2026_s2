import { db } from '../lib/db';
import { asyncHandler, forbidden, notFound, unauthorized } from '../lib/http';
import { projectIdOf, taskIdOf } from '../lib/params';

export async function isMember(userId: number, projectId: number): Promise<boolean> {
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return membership !== null;
}

export async function isOwner(userId: number, projectId: number): Promise<boolean> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  return project !== null && project.ownerId === userId;
}

/**
 * Verifica que el usuario autenticado sea miembro vigente del proyecto
 * indicado en el parámetro de ruta :projectId.
 */
export function requireProjectMember() {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }
    const projectId = projectIdOf(req);
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw notFound('Project not found');
    }
    if (!(await isMember(req.user.userId, projectId))) {
      throw forbidden('You are not a member of this project');
    }
    next();
  });
}

/** Verifica membresía a partir de una tarea (:taskId). */
export function requireTaskProjectMember() {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }
    const taskId = taskIdOf(req);
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw notFound('Task not found');
    }
    if (!(await isMember(req.user.userId, task.projectId))) {
      throw forbidden('You are not a member of this project');
    }
    next();
  });
}
