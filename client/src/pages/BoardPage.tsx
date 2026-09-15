import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import { useProject } from '../lib/project';
import { useMembers } from '../lib/members';
import { toCreateBody } from '../lib/taskBody';
import { ErrorMessage, Loading } from '../lib/ui';
import { MemberSelect, PrioritySelect, StatusSelect } from '../components/task/selects';
import TaskFields, { EMPTY_TASK_FIELDS, TaskFieldValues } from '../components/task/TaskFields';
import { STATUSES, STATUS_LABELS, Task, TaskListResponse } from '../types';

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

  const [fields, setFields] = useState<TaskFieldValues>(EMPTY_TASK_FIELDS);
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
      setListError(errorText(err, 'No se pudieron cargar las tareas'));
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
      const body = toCreateBody(fields);
      await api<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body });
      setFields(EMPTY_TASK_FIELDS);
      await loadTasks();
    } catch (err) {
      setCreateError(errorText(err, 'No se pudo crear la tarea'));
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
      setListError(errorText(err, 'No se pudo cambiar el estado'));
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
        <TaskFields
          value={fields}
          onChange={setFields}
          members={members}
          testIdPrefix="task-create"
        />
        <button type="submit" data-testid="task-create-submit" disabled={creating}>
          Crear tarea
        </button>
      </form>
      <ErrorMessage message={createError} />

      <form className="form form-inline" data-testid="filter-form" onSubmit={applyFilters}>
        <label className="field">
          <span>Prioridad</span>
          <PrioritySelect
            testId="filter-priority-select"
            value={draftFilters.priority}
            onChange={(priority) => setDraftFilters({ ...draftFilters, priority })}
            emptyOption="Todas"
          />
        </label>
        <label className="field">
          <span>Asignado</span>
          <MemberSelect
            testId="filter-assignee-select"
            value={draftFilters.assignedTo}
            onChange={(assignedTo) => setDraftFilters({ ...draftFilters, assignedTo })}
            members={members}
            emptyOption="Todos"
          />
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
                      <StatusSelect
                        testId="task-card-status-select"
                        value={task.status}
                        onChange={(status) => changeStatus(task, status)}
                        includeUnknown
                      />
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
