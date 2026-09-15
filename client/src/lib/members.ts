import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { MEMBER, OWNER } from '../types';
import type { Member, Project, TaskListResponse } from '../types';

function cacheKey(projectId: string): string {
  return `taskflow_members_${projectId}`;
}

function readCache(projectId: string): Member[] {
  const raw = localStorage.getItem(cacheKey(projectId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Member[]) : [];
  } catch {
    return [];
  }
}

function writeCache(projectId: string, members: Member[]): void {
  localStorage.setItem(cacheKey(projectId), JSON.stringify(members));
}

function mergeMembers(base: Member[], incoming: Member[]): Member[] {
  const byId = new Map<string, Member>();
  for (const m of base) byId.set(m.userId, m);
  for (const m of incoming) {
    const existing = byId.get(m.userId);
    if (!existing) {
      byId.set(m.userId, m);
    } else {
      byId.set(m.userId, {
        userId: m.userId,
        email: existing.email || m.email,
        role: existing.role === OWNER || m.role === OWNER ? OWNER : existing.role || m.role,
      });
    }
  }
  return [...byId.values()];
}

/**
 * Reúne los miembros conocidos de un proyecto: los que quedaron guardados de
 * altas y bajas previas, el owner del proyecto y los usuarios que figuran como
 * responsables de alguna tarea.
 */
export function useMembers(project: Project | null) {
  const projectId = project?.id ?? null;
  const [members, setMembers] = useState<Member[]>(() =>
    projectId ? readCache(projectId) : [],
  );

  const persist = useCallback(
    (next: Member[]) => {
      if (!projectId) return;
      writeCache(projectId, next);
      setMembers(next);
    },
    [projectId],
  );

  const reload = useCallback(async () => {
    if (!project) return;
    const res = await api<TaskListResponse>(`/projects/${project.id}/tasks`);
    const fromTasks: Member[] = [];
    for (const task of res.items) {
      if (task.assignee) {
        fromTasks.push({ userId: task.assignee.id, email: task.assignee.email, role: MEMBER });
      }
    }
    const ownerRow: Member = { userId: project.ownerId, email: '', role: OWNER };
    const merged = mergeMembers(readCache(project.id), mergeMembers([ownerRow], fromTasks));
    persist(merged);
  }, [project, persist]);

  useEffect(() => {
    if (!projectId) {
      setMembers([]);
      return;
    }
    setMembers(readCache(projectId));
    void reload();
  }, [projectId, reload]);

  const addMember = useCallback(
    (member: Member) => {
      persist(mergeMembers(members, [member]));
    },
    [members, persist],
  );

  const removeMember = useCallback(
    (userId: string) => {
      persist(members.filter((m) => m.userId !== userId));
    },
    [members, persist],
  );

  return { members, addMember, removeMember, reload };
}
