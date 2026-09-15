import { badRequest, conflict, forbidden, notFound } from '../../lib/http';
import { toPublicId } from '../../lib/ids';
import { assertOptionalString, MEMBER, OWNER } from '../../lib/validation';
import * as repo from './projects.repository';

const EMAIL_CHECK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function serialize(p: {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  archived: boolean;
  createdAt: Date;
}) {
  return {
    id: toPublicId('proj', p.id),
    name: p.name,
    description: p.description,
    ownerId: toPublicId('user', p.ownerId),
    archived: p.archived,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function createProject(userId: number, body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length > 100) {
    throw badRequest('name must be between 3 and 100 characters');
  }
  const description = assertOptionalString(body.description, 'description', 500);

  const duplicate = await repo.findByOwnerAndName(userId, name);
  if (duplicate) throw conflict('You already have a project with that name');

  const project = await repo.insert({ name, description: description ?? null, ownerId: userId });
  await repo.insertMember(project.id, userId, OWNER);

  return serialize(project);
}

export async function listProjects(userId: number) {
  const projects = await repo.listForUser(userId);
  return projects.map(serialize);
}

export async function updateProject(id: number, userId: number, body: Record<string, unknown>) {
  const project = await repo.findById(id);
  if (!project) throw notFound('Project not found');
  if (project.ownerId !== userId) {
    const membership = await repo.findMembership(id, userId);
    if (membership) throw forbidden('Only the project owner can edit it');
    throw notFound('Project not found');
  }

  const data: { name?: string; description?: string | null } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 3 || name.length > 100) {
      throw badRequest('name must be between 3 and 100 characters');
    }
    const duplicate = await repo.findByOwnerAndName(userId, name, id);
    if (duplicate) throw conflict('You already have a project with that name');
    data.name = name;
  }

  if (body.description !== undefined) {
    data.description = assertOptionalString(body.description, 'description', 500) ?? null;
  }

  return serialize(await repo.updateById(id, data));
}

export async function deleteProject(id: number, userId: number): Promise<void> {
  const project = await repo.findById(id);
  if (!project) throw notFound('Project not found');
  if (project.ownerId !== userId) {
    const membership = await repo.findMembership(id, userId);
    if (membership) throw forbidden('Only the project owner can delete it');
    throw notFound('Project not found');
  }

  await repo.removeById(id);
}

export async function addMember(id: number, userId: number, body: Record<string, unknown>) {
  const project = await repo.findById(id);
  if (!project) throw notFound('Project not found');
  if (project.ownerId !== userId) throw forbidden('Only the project owner can manage members');

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_CHECK.test(email)) throw badRequest('email must be a valid address');

  const user = await repo.findUserByEmail(email);
  if (!user) throw notFound('No user found with that email');

  const existing = await repo.findMembership(id, user.id);
  if (existing) throw conflict('User is already a member of this project');

  await repo.insertMember(id, user.id, MEMBER);
  return {
    projectId: toPublicId('proj', id),
    userId: toPublicId('user', user.id),
    email: user.email,
    role: MEMBER,
  };
}

export async function removeMember(id: number, actingUserId: number, memberId: number): Promise<void> {
  const project = await repo.findById(id);
  if (!project) throw notFound('Project not found');
  if (project.ownerId !== actingUserId) {
    throw forbidden('Only the project owner can manage members');
  }
  if (memberId === project.ownerId) {
    throw badRequest('The project owner cannot be removed from the project');
  }

  const membership = await repo.findMembership(id, memberId);
  if (!membership) throw notFound('User is not a member of this project');

  await repo.removeMemberById(membership.id);
}
