import { asyncHandler, notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import * as service from './comments.service';

export const list = asyncHandler(async (req, res) => {
  const taskId = parsePublicId(req.params.taskId, 'task');
  if (taskId === null) throw notFound('Task not found');
  res.json(await service.list(taskId));
});

export const create = asyncHandler(async (req, res) => {
  const taskId = parsePublicId(req.params.taskId, 'task');
  if (taskId === null) throw notFound('Task not found');
  res.status(201).json(await service.create(taskId, req.user!.userId, req.body ?? {}));
});

export const remove = asyncHandler(async (req, res) => {
  const commentId = parsePublicId(req.params.commentId, 'comment');
  if (commentId === null) throw notFound('Comment not found');
  await service.remove(commentId, req.user!.userId);
  res.status(204).send();
});
