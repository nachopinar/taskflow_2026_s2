import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { useAsyncAction } from '../../lib/asyncAction';
import { ErrorMessage, Loading } from '../../lib/ui';
import type { Comment } from '../../types';

interface TaskCommentsProps {
  taskId: string;
  /** null mientras se cargan por primera vez. */
  comments: Comment[] | null;
  loadError: string | null;
  onChanged: () => Promise<void>;
  currentUserId: string | undefined;
  memberLabel: (userId: string) => string;
}

export default function TaskComments({
  taskId,
  comments,
  loadError,
  onChanged,
  currentUserId,
  memberLabel,
}: TaskCommentsProps) {
  const [body, setBody] = useState('');
  const { run, busy: posting, error } = useAsyncAction();

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api(`/tasks/${taskId}/comments`, { method: 'POST', body: { body } });
      setBody('');
      await onChanged();
    }, 'No se pudo publicar el comentario');
  }

  async function onDelete(id: string) {
    await run(
      async () => {
        await api(`/comments/${id}`, { method: 'DELETE' });
        await onChanged();
      },
      'No se pudo borrar el comentario',
      { trackBusy: false },
    );
  }

  return (
    <section className="section" data-testid="task-comments-section">
      <h2>Comentarios</h2>
      <form className="form" data-testid="comment-add-form" onSubmit={onAdd}>
        <textarea
          data-testid="comment-add-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" data-testid="comment-add-button" disabled={posting}>
          Comentar
        </button>
      </form>
      <ErrorMessage message={error} />

      {comments === null ? (
        <Loading label="Cargando comentarios…" />
      ) : (
        <>
          <ErrorMessage message={loadError} />
          <ul className="comment-list" data-testid="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item" data-testid="comment-item">
                <p className="comment-item-body" data-testid="comment-item-body">
                  {comment.body}
                </p>
                <div className="comment-item-meta">
                  <span data-testid="comment-item-author">{memberLabel(comment.authorId)}</span>
                  <span data-testid="comment-item-date">{comment.createdAt}</span>
                  {comment.authorId === currentUserId && (
                    <button
                      type="button"
                      data-testid="comment-delete-button"
                      onClick={() => onDelete(comment.id)}
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
  );
}
