import { asyncHandler } from '../../lib/http';
import { commentIdOf, taskIdOf } from '../../lib/params';
import * as service from './comments.service';

export const list = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  res.json(await service.list(taskId));
});

export const create = asyncHandler(async (req, res) => {
  const taskId = taskIdOf(req);
  res.status(201).json(await service.create(taskId, req.user!.userId, req.body ?? {}));
});

export const remove = asyncHandler(async (req, res) => {
  const commentId = commentIdOf(req);
  await service.remove(commentId, req.user!.userId);
  res.status(204).send();
});
