import type { Request, RequestParamHandler } from 'express';
import { notFound } from './http';
import { parsePublicId, Prefix } from './ids';

interface RouteIds {
  projectId?: number;
  taskId?: number;
  commentId?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ids?: RouteIds;
    }
  }
}

/** Parsea un parámetro de ruta una sola vez y lo deja en req.ids. */
export function idParam(prefix: Prefix, key: keyof RouteIds, message: string): RequestParamHandler {
  return (req, _res, next, value) => {
    const id = parsePublicId(value, prefix);
    if (id === null) {
      next(notFound(message));
      return;
    }
    req.ids = { ...req.ids, [key]: id };
    next();
  };
}

function idOf(req: Request, key: keyof RouteIds): number {
  const id = req.ids?.[key];
  if (id === undefined) {
    throw new Error(`Route is missing a router.param handler for :${key}`);
  }
  return id;
}

export const projectIdOf = (req: Request): number => idOf(req, 'projectId');
export const taskIdOf = (req: Request): number => idOf(req, 'taskId');
export const commentIdOf = (req: Request): number => idOf(req, 'commentId');
