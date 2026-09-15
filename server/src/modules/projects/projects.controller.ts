import { asyncHandler, notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import { projectIdOf } from '../../lib/params';
import * as service from './projects.service';

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createProject(req.user!.userId, req.body ?? {}));
});

export const list = asyncHandler(async (req, res) => {
  res.json(await service.listProjects(req.user!.userId));
});

export const update = asyncHandler(async (req, res) => {
  const id = projectIdOf(req);
  res.json(await service.updateProject(id, req.user!.userId, req.body ?? {}));
});

export const remove = asyncHandler(async (req, res) => {
  const id = projectIdOf(req);
  await service.deleteProject(id, req.user!.userId);
  res.status(204).send();
});

export const addMember = asyncHandler(async (req, res) => {
  const id = projectIdOf(req);
  res.status(201).json(await service.addMember(id, req.user!.userId, req.body ?? {}));
});

export const removeMember = asyncHandler(async (req, res) => {
  const id = projectIdOf(req);
  const memberId = parsePublicId(req.params.userId, 'user');
  if (memberId === null) throw notFound('Project not found');
  await service.removeMember(id, req.user!.userId, memberId);
  res.status(204).send();
});
