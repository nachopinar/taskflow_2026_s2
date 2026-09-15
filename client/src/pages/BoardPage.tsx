import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useProject } from '../lib/project';
import { useMembers } from '../lib/members';
import { ErrorMessage, Loading } from '../lib/ui';
import { isStatus, PRIORITIES, STATUSES, STATUS_LABELS, Task, TaskListResponse } from '../types';

interface Filters {
  priority: string;
  assignedTo: string;
  search: string;
}

const EMPTY_FILTERS: Filters = { priority: '', assignedTo: '', search: '' };

export default function BoardPage() {
  const { projectId } = useParams();
  const { project, loading: projectLoading, error: projectError } = useProject(projectId);
  const { members } = useMembers(project);

  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const [data, setData] = useState<TaskListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedFilters.priority) params.set('priority', appliedFilters.priority);
    if (appliedFilters.assignedTo) params.set('assignedTo', appliedFilters.assignedTo);
    if (appliedFilters.search) params.set('search', appliedFilters.search);
    const s = params.toString();
    return s ? `?${s}` : '';
  }, [appliedFilters]);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setListLoading(true);
    setListError(null);
    try {
      const res = await api<TaskListResponse>(`/projects/${projectId}/tasks${query}`);
      setData(res);
    } catch (err) {
      setData(null);
      setListError(err instanceof ApiError ? err.message : 'No se pudieron cargar las tareas');
    } finally {
      setListLoading(false);
    }
  }, [projectId, query]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setAppliedFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const body: Record<string, unknown> = { title };
      if (description) body.description = description;
      if (priority) body.priority = priority;
      if (assigneeId) body.assigneeId = assigneeId;
      if (dueDate) body.dueDate = dueDate;
      await api<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body });
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId('');
      setDueDate('');
      await loadTasks();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'No se pudo crear la tarea');
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(task: Task, status: string) {
    setListError(null);
    try {
      await api<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: { status } });
      await loadTasks();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    }
  }

  const items = data?.items ?? [];
  const columns = STATUSES.map((status) => ({
    status,
    tasks: items.filter((t) => t.status === status),
  }));

  if (projectLoading) return <Loading label="Cargando proyecto…" />;
  if (projectError) return <ErrorMessage message={projectError} />;
  if (!project) return <ErrorMessage message="No se encontró el proyecto" />;

  return (
    <div className="page" data-testid="board-page">
      <div className="page-head">
        <h1 data-testid="board-project-name">{project.name}</h1>
        <Link to={`/projects/${project.id}/members`} data-testid="board-members-link">
          Miembros
        </Link>
      </div>

      <form className="form form-inline" data-testid="task-create-form" onSubmit={onCreate}>
        <label className="field">
          <span>Título</span>
          <input
            type="text"
            data-testid="task-create-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Descripción</span>
          <input
            type="text"
            data-testid="task-create-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Prioridad</span>
          <select
            data-testid="task-create-priority-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Asignado</span>
          <select
            data-testid="task-create-assignee-select"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email || m.userId}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Vencimiento</span>
          <input
            type="date"
            data-testid="task-create-duedate-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <button type="submit" data-testid="task-create-submit" disabled={creating}>
          Crear tarea
        </button>
      </form>
      <ErrorMessage message={createError} />

      <form className="form form-inline" data-testid="filter-form" onSubmit={applyFilters}>
        <label className="field">
          <span>Prioridad</span>
          <select
            data-testid="filter-priority-select"
            value={draftFilters.priority}
            onChange={(e) => setDraftFilters({ ...draftFilters, priority: e.target.value })}
          >
            <option value="">Todas</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Asignado</span>
          <select
            data-testid="filter-assignee-select"
            value={draftFilters.assignedTo}
            onChange={(e) => setDraftFilters({ ...draftFilters, assignedTo: e.target.value })}
          >
            <option value="">Todos</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email || m.userId}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Buscar</span>
          <input
            type="text"
            data-testid="filter-search-input"
            value={draftFilters.search}
            onChange={(e) => setDraftFilters({ ...draftFilters, search: e.target.value })}
          />
        </label>
        <button type="submit" data-testid="filter-apply-button">
          Aplicar
        </button>
        <button type="button" data-testid="filter-clear-button" onClick={clearFilters}>
          Limpiar
        </button>
      </form>

      <p className="board-summary" data-testid="board-total">
        Total: {data?.total ?? 0}
      </p>

      <ErrorMessage message={listError} />

      {listLoading ? (
        <Loading label="Cargando tareas…" />
      ) : (
        <div className="board">
          {columns.map((column) => (
            <section
              key={column.status}
              className="board-column"
              data-testid={`board-column-${column.status}`}
            >
              <h2 className="board-column-title">
                {STATUS_LABELS[column.status]}{' '}
                <span data-testid={`board-column-count-${column.status}`}>
                  ({column.tasks.length})
                </span>
              </h2>
              <ul className="board-column-list" data-testid={`board-column-list-${column.status}`}>
                {column.tasks.map((task) => (
                  <li key={task.id} className="task-card" data-testid="task-card">
                    <Link
                      to={`/projects/${project.id}/tasks/${task.id}`}
                      className="task-card-title"
                      data-testid="task-card-title"
                    >
                      {task.title}
                    </Link>
                    <div className="task-card-row">
                      <span data-testid="task-card-priority">{task.priority}</span>
                      <span data-testid="task-card-assignee">
                        {task.assignee ? task.assignee.email : 'Sin asignar'}
                      </span>
                    </div>
                    <div className="task-card-row">
                      <span data-testid="task-card-duedate">{task.dueDate ?? '—'}</span>
                      <span data-testid="task-card-comment-count">
                        {task.commentCount ?? 0} comentarios
                      </span>
                    </div>
                    <label className="field">
                      <span>Estado</span>
                      <select
                        data-testid="task-card-status-select"
                        value={task.status}
                        onChange={(e) => changeStatus(task, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        {!isStatus(task.status) && (
                          <option value={task.status}>{task.status}</option>
                        )}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
