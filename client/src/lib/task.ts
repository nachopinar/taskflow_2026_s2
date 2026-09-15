import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from './api';
import type { Comment, HistoryEntry, Task } from '../types';

export function useTask(taskId: string | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      setTask(await api<Task>(`/tasks/${taskId}`));
    } catch (err) {
      setError(errorText(err, 'No se pudo cargar la tarea'));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { task, setTask, loading, error, reload };
}

/**
 * Comentarios de una tarea. Vive en la página (no en TaskComments) para que la
 * lista no se vuelva a pedir cuando la tarea se recarga y las secciones se remontan.
 */
export function useTaskComments(taskId: string | undefined) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!taskId) return;
    setError(null);
    try {
      setComments(await api<Comment[]>(`/tasks/${taskId}/comments`));
    } catch (err) {
      setComments([]);
      setError(errorText(err, 'No se pudieron cargar los comentarios'));
    }
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { comments, error, reload };
}

export function useTaskHistory(taskId: string | undefined) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const reload = useCallback(async () => {
    if (!taskId) return;
    try {
      setEntries(await api<HistoryEntry[]>(`/tasks/${taskId}/history`));
    } catch {
      setEntries([]);
    }
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { entries, reload };
}
