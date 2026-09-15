import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useProject } from '../lib/project';
import { useMembers } from '../lib/members';
import { ErrorMessage, Loading } from '../lib/ui';
import {
  Comment,
  HistoryEntry,
  PRIORITIES,
  STATUSES,
  Task,
} from '../types';

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { project } = useProject(projectId);
  const { members } = useMembers(project);

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('TODO');
  const [statusError, setStatusError] = useState<string | null>(null);

  const [tagName, setTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const syncForm = useCallback((t: Task) => {
    setTitle(t.title);
    setDescription(t.description ?? '');
    setPriority(t.priority);
    setAssigneeId(t.assigneeId ?? '');
    setDueDate(t.dueDate ?? '');
    setStatus(t.status);
  }, []);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const t = await api<Task>(`/tasks/${taskId}`);
      setTask(t);
      syncForm(t);
    } catch (err) {
      setLoadError(errorText(err, 'No se pudo cargar la tarea'));
    } finally {
      setLoading(false);
    }
  }, [taskId, syncForm]);

  const loadComments = useCallback(async () => {
    if (!taskId) return;
    setCommentsError(null);
    try {
      const rows = await api<Comment[]>(`/tasks/${taskId}/comments`);
      setComments(rows);
    } catch (err) {
      setComments([]);
      setCommentsError(errorText(err, 'No se pudieron cargar los comentarios'));
    }
  }, [taskId]);

  const loadHistory = useCallback(async () => {
    if (!taskId) return;
    try {
      const rows = await api<HistoryEntry[]>(`/tasks/${taskId}/history`);
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  }, [taskId]);

  useEffect(() => {
    void loadTask();
    void loadComments();
    void loadHistory();
  }, [loadTask, loadComments, loadHistory]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!taskId) return;
    setSaveError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description: description === '' ? null : description,
        priority,
        assigneeId: assigneeId === '' ? null : assigneeId,
        dueDate: dueDate === '' ? null : dueDate,
      };
      const updated = await api<Task>(`/tasks/${taskId}`, { method: 'PATCH', body });
      setTask(updated);
      syncForm(updated);
    } catch (err) {
      setSaveError(errorText(err, 'No se pudo guardar la tarea'));
    } finally {
      setSaving(false);
    }
  }

  async function onChangeStatus(e: FormEvent) {
    e.preventDefault();
    if (!taskId) return;
    setStatusError(null);
    try {
      const updated = await api<Task>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status },
      });
      setTask(updated);
      syncForm(updated);
      await loadHistory();
    } catch (err) {
      setStatusError(errorText(err, 'No se pudo cambiar el estado'));
    }
  }

  async function onAddTag(e: FormEvent) {
    e.preventDefault();
    if (!taskId) return;
    setTagError(null);
    try {
      await api(`/tasks/${taskId}/tags`, { method: 'POST', body: { name: tagName } });
      setTagName('');
      await loadTask();
    } catch (err) {
      setTagError(errorText(err, 'No se pudo agregar la etiqueta'));
    }
  }

  async function onRemoveTag(tagId: string) {
    if (!taskId) return;
    setTagError(null);
    try {
      await api(`/tasks/${taskId}/tags/${tagId}`, { method: 'DELETE' });
      await loadTask();
    } catch (err) {
      setTagError(errorText(err, 'No se pudo quitar la etiqueta'));
    }
  }

  async function onAddComment(e: FormEvent) {
    e.preventDefault();
    if (!taskId) return;
    setCommentError(null);
    setPostingComment(true);
    try {
      await api(`/tasks/${taskId}/comments`, { method: 'POST', body: { body: commentBody } });
      setCommentBody('');
      await loadComments();
    } catch (err) {
      setCommentError(errorText(err, 'No se pudo publicar el comentario'));
    } finally {
      setPostingComment(false);
    }
  }

  async function onDeleteComment(id: string) {
    setCommentError(null);
    try {
      await api(`/comments/${id}`, { method: 'DELETE' });
      await loadComments();
    } catch (err) {
      setCommentError(errorText(err, 'No se pudo borrar el comentario'));
    }
  }

  async function onDeleteTask() {
    if (!taskId) return;
    setSaveError(null);
    try {
      await api(`/tasks/${taskId}`, { method: 'DELETE' });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setSaveError(errorText(err, 'No se pudo borrar la tarea'));
    }
  }

  function memberLabel(userId: string): string {
    const found = members.find((m) => m.userId === userId);
    return found && found.email ? found.email : userId;
  }

  if (loading) return <Loading label="Cargando tarea…" />;
  if (loadError) return <ErrorMessage message={loadError} />;
  if (!task) return <ErrorMessage message="No se encontró la tarea" />;

  return (
    <div className="page" data-testid="task-detail-page">
      <div className="page-head">
        <Link to={`/projects/${projectId}`} data-testid="task-detail-back-link">
          ← Volver al tablero
        </Link>
        <span data-testid="task-detail-id">{task.id}</span>
      </div>

      <form className="form" data-testid="task-edit-form" onSubmit={onSave}>
        <label className="field">
          <span>Título</span>
          <input
            type="text"
            data-testid="task-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea
            data-testid="task-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Prioridad</span>
          <select
            data-testid="task-priority-select"
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
            data-testid="task-assignee-select"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email || m.userId}
              </option>
            ))}
            {assigneeId && !members.some((m) => m.userId === assigneeId) && (
              <option value={assigneeId}>{assigneeId}</option>
            )}
          </select>
        </label>
        <label className="field">
          <span>Vencimiento</span>
          <input
            type="date"
            data-testid="task-duedate-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <p className="field-value">
          Vencimiento actual:{' '}
          <span data-testid="task-duedate-value">{task.dueDate ?? '—'}</span>
        </p>
        <ErrorMessage message={saveError} />
        <div className="form-actions">
          <button type="submit" data-testid="task-save-button" disabled={saving}>
            Guardar
          </button>
          <button type="button" data-testid="task-delete-button" onClick={onDeleteTask}>
            Borrar tarea
          </button>
        </div>
      </form>

      <form className="form form-inline" data-testid="task-status-form" onSubmit={onChangeStatus}>
        <label className="field">
          <span>Estado</span>
          <select
            data-testid="task-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" data-testid="task-status-submit">
          Cambiar estado
        </button>
        <span data-testid="task-current-status">{task.status}</span>
      </form>
      <ErrorMessage message={statusError} />

      <section className="section" data-testid="task-tags-section">
        <h2>Etiquetas</h2>
        <ul className="tag-list" data-testid="tag-list">
          {(task.tags ?? []).map((tag, index) => (
            <li key={`${tag.id}-${index}`} className="tag-chip" data-testid="tag-chip">
              <span data-testid="tag-chip-name">{tag.name}</span>
              <button
                type="button"
                data-testid="tag-remove-button"
                onClick={() => onRemoveTag(tag.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form className="form form-inline" data-testid="tag-add-form" onSubmit={onAddTag}>
          <input
            type="text"
            data-testid="tag-add-input"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
          <button type="submit" data-testid="tag-add-button">
            Agregar etiqueta
          </button>
        </form>
        <ErrorMessage message={tagError} />
      </section>

      <section className="section" data-testid="task-comments-section">
        <h2>Comentarios</h2>
        <form className="form" data-testid="comment-add-form" onSubmit={onAddComment}>
          <textarea
            data-testid="comment-add-input"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <button type="submit" data-testid="comment-add-button" disabled={postingComment}>
            Comentar
          </button>
        </form>
        <ErrorMessage message={commentError} />

        {comments === null ? (
          <Loading label="Cargando comentarios…" />
        ) : (
          <>
            <ErrorMessage message={commentsError} />
            <ul className="comment-list" data-testid="comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className="comment-item" data-testid="comment-item">
                  <p className="comment-item-body" data-testid="comment-item-body">
                    {comment.body}
                  </p>
                  <div className="comment-item-meta">
                    <span data-testid="comment-item-author">{memberLabel(comment.authorId)}</span>
                    <span data-testid="comment-item-date">{comment.createdAt}</span>
                    {comment.authorId === user?.id && (
                      <button
                        type="button"
                        data-testid="comment-delete-button"
                        onClick={() => onDeleteComment(comment.id)}
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="section" data-testid="task-history-section">
        <h2>Historial de estados</h2>
        <ul className="history-list" data-testid="history-list">
          {history.map((entry) => (
            <li key={entry.id} className="history-item" data-testid="history-item">
              {entry.fromStatus ?? '—'} → {entry.toStatus} · {entry.changedAt}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
