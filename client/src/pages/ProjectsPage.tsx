import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import { EmptyState, ErrorMessage, Loading } from '../lib/ui';
import type { Project } from '../types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await api<Project[]>('/projects');
      setProjects(data);
    } catch (err) {
      setProjects([]);
      setLoadError(errorText(err, 'No se pudieron cargar los proyectos'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      await api<Project>('/projects', { method: 'POST', body });
      setName('');
      setDescription('');
      await load();
    } catch (err) {
      setFormError(errorText(err, 'No se pudo crear el proyecto'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page" data-testid="projects-page">
      <h1>Proyectos</h1>

      <form className="form form-inline" data-testid="project-create-form" onSubmit={onCreate}>
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            data-testid="project-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Descripción</span>
          <input
            type="text"
            data-testid="project-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button type="submit" data-testid="project-create-submit" disabled={submitting}>
          Crear proyecto
        </button>
      </form>
      <ErrorMessage message={formError} />

      {projects === null ? (
        <Loading label="Cargando proyectos…" />
      ) : (
        <>
          <ErrorMessage message={loadError} />
          <ul className="list" data-testid="project-list">
            {projects.map((project) => (
              <li key={project.id} className="card" data-testid="project-card">
                <Link
                  to={`/projects/${project.id}`}
                  className="card-title"
                  data-testid="project-card-name"
                >
                  {project.name}
                </Link>
                <p className="card-sub" data-testid="project-card-description">
                  {project.description || 'Sin descripción'}
                </p>
                <div className="card-meta">
                  {project.archived && (
                    <span data-testid="project-card-archived">Archivado</span>
                  )}
                  <Link
                    to={`/projects/${project.id}/members`}
                    data-testid="project-card-members-link"
                  >
                    Miembros
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {projects.length === 0 && !loadError && (
            <EmptyState>Todavía no hay proyectos.</EmptyState>
          )}
        </>
      )}
    </div>
  );
}
