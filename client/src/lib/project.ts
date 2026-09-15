import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from './api';
import type { Project } from '../types';

interface ProjectState {
  project: Project | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useProject(projectId: string | undefined): ProjectState {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const projects = await api<Project[]>('/projects');
      const found = projects.find((p) => p.id === projectId) ?? null;
      setProject(found);
      if (!found) setError('No se encontró el proyecto');
    } catch (err) {
      setError(errorText(err, 'No se pudo cargar el proyecto'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { project, loading, error, reload };
}
