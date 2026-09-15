import { NextFunction, Request, Response } from 'express';
import { notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import * as service from './comments.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.json(await service.list(taskId));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parsePublicId(req.params.taskId, 'task');
    if (taskId === null) throw notFound('Task not found');
    res.status(201).json(await service.create(taskId, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const commentId = parsePublicId(req.params.commentId, 'comment');
    if (commentId === null) throw notFound('Comment not found');
    await service.remove(commentId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
