import { asyncHandler, notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import { projectIdOf, taskIdOf } from '../../lib/params';
import * as repo from './tasks.repository';
import * as service from './tasks.service';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const listByProject = asyncHandler(async (req, res) => {
  const projectId = projectIdOf(req);

  const assignedTo = req.query.assignedTo
    ? parsePublicId(String(req.query.assignedTo), 'user') ?? undefined
    : undefined;

  const filters: repo.TaskFilters = {
    status: req.query.status ? String(req.query.status) : undefined,
    priority: req.query.priority ? String(req.query.priority) : undefined,
    assigneeId: assignedTo,
    search: req.query.search ? String(req.query.search) : undefined,
  };

  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Number(req.query.offset) || 0;

  const items = await service.listTasks(projectId, filters);

  res.json({ items, total: items.length, limit, offset });
});

export const create = asyncHandler(async (req, res) => {
  const projectId = projectIdOf(req);
  res.status(201).json(await service.createTask(projectId, req.user!.userId, req.body ?? {}));
});

export const getOne = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  res.json(await service.getTask(taskId));
});

export const update = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  res.json(await service.updateTask(taskId, req.user!.userId, req.body ?? {}));
});

export const remove = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  await service.deleteTask(taskId);
  res.status(204).send();
});

export const addTag = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  res.status(201).json(await service.addTag(taskId, req.body?.name));
});

export const removeTag = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  const tagId = parsePublicId(req.params.tagId, 'tag');
  if (tagId === null) throw notFound('Task not found');
  await service.removeTag(taskId, tagId);
  res.status(204).send();
});

export const history = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  res.json(await service.listHistory(taskId));
});
