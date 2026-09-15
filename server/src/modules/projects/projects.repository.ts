import { db } from '../../lib/db';
import type { Role } from '../../lib/validation';

export function findById(id: number) {
  return db.project.findUnique({ where: { id } });
}

export function findByOwnerAndName(ownerId: number, name: string, excludeId?: number) {
  return db.project.findFirst({
    where: excludeId === undefined ? { ownerId, name } : { ownerId, name, id: { not: excludeId } },
  });
}

export function listForUser(userId: number) {
  return db.project.findMany({
    where: {
      OR: [
        { ownerId: userId, archived: false },
        { members: { some: { userId } }, ownerId: { not: userId } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

export function insert(data: { name: string; description: string | null; ownerId: number }) {
  return db.project.create({ data });
}

export function updateById(id: number, data: { name?: string; description?: string | null }) {
  return db.project.update({ where: { id }, data });
}

export function removeById(id: number) {
  return db.project.delete({ where: { id } });
}

export function findMembership(projectId: number, userId: number) {
  return db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export function insertMember(projectId: number, userId: number, role: Role) {
  return db.projectMember.create({ data: { projectId, userId, role } });
}

export function removeMemberById(id: number) {
  return db.projectMember.delete({ where: { id } });
}

export function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}
