import type { Comment } from '@prisma/client';
import { badRequest, forbidden, notFound } from '../../lib/http';
import { toPublicId } from '../../lib/ids';
import * as repo from './comments.repository';

const MAX_LENGTH = 1000;

export function serialize(c: Comment) {
  try {
    return {
      id: toPublicId('comment', c.id),
      taskId: toPublicId('task', c.taskId),
      authorId: toPublicId('user', c.authorId),
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function list(taskId: number) {
  const rows = await repo.listByTask(taskId);
  return rows.map(serialize);
}

export async function create(taskId: number, authorId: number, body: Record<string, unknown>) {
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (text.length < 1 || text.length > MAX_LENGTH) {
    throw badRequest(`Comment body must be between 1 and ${MAX_LENGTH} characters`);
  }
  return serialize(await repo.insert(taskId, authorId, text));
}

export async function remove(commentId: number, userId: number): Promise<void> {
  const comment = await repo.findById(commentId);
  if (!comment) throw notFound('Comment not found');
  if (comment.authorId !== userId) {
    throw forbidden('You can only delete your own comments');
  }
  await repo.removeById(commentId);
}
