import { NextFunction, Request, Response } from 'express';
import { notFound } from '../../lib/http';
import { parsePublicId } from '../../lib/ids';
import * as service from './projects.service';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await service.createProject(req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.listProjects(req.user!.userId));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parsePublicId(req.params.projectId, 'proj');
    if (id === null) throw notFound('Project not found');
    res.json(await service.updateProject(id, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parsePublicId(req.params.projectId, 'proj');
    if (id === null) throw notFound('Project not found');
    await service.deleteProject(id, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parsePublicId(req.params.projectId, 'proj');
    if (id === null) throw notFound('Project not found');
    res.status(201).json(await service.addMember(id, req.user!.userId, req.body ?? {}));
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parsePublicId(req.params.projectId, 'proj');
    const memberId = parsePublicId(req.params.userId, 'user');
    if (id === null || memberId === null) throw notFound('Project not found');
    await service.removeMember(id, req.user!.userId, memberId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
