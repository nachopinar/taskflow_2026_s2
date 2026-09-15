import { NextFunction, Request, Response } from 'express';
import { notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import * as repo from './tasks.repository';
import * as service from './tasks.service';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = parsePublicId(req.params.projectId, 'proj');
    if (projectId === null) throw notFound('Project not found');

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
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = parsePublicId(req.params.projectId, 'proj');
    if (projectId === null) throw notFound('Project not found');
    res.status(201).json(await service.createTask(projectId, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.json(await service.getTask(taskId));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.json(await service.updateTask(taskId, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    await service.deleteTask(taskId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.status(201).json(await service.addTag(taskId, req.body?.name));
  } catch (err) {
    next(err);
  }
}

export async function removeTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    const tagId = parsePublicId(req.params.tagId, 'tag');
    if (taskId === null || tagId === null) throw notFound('Task not found');
    await service.removeTag(taskId, tagId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.json(await service.listHistory(taskId));
  } catch (err) {
    next(err);
  }
}
