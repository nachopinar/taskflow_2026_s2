import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { useAsyncAction } from '../../lib/asyncAction';
import { ErrorMessage } from '../../lib/ui';
import type { Task } from '../../types';

interface TaskTagsProps {
  task: Task;
  onChanged: () => Promise<void>;
}

export default function TaskTags({ task, onChanged }: TaskTagsProps) {
  const [tagName, setTagName] = useState('');
  const { run, error } = useAsyncAction();

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api(`/tasks/${task.id}/tags`, { method: 'POST', body: { name: tagName } });
      setTagName('');
      await onChanged();
    }, 'No se pudo agregar la etiqueta');
  }

  async function onRemove(tagId: string) {
    await run(async () => {
      await api(`/tasks/${task.id}/tags/${tagId}`, { method: 'DELETE' });
      await onChanged();
    }, 'No se pudo quitar la etiqueta');
  }

  return (
    <section className="section" data-testid="task-tags-section">
      <h2>Etiquetas</h2>
      <ul className="tag-list" data-testid="tag-list">
        {(task.tags ?? []).map((tag, index) => (
          <li key={`${tag.id}-${index}`} className="tag-chip" data-testid="tag-chip">
            <span data-testid="tag-chip-name">{tag.name}</span>
            <button type="button" data-testid="tag-remove-button" onClick={() => onRemove(tag.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="form form-inline" data-testid="tag-add-form" onSubmit={onAdd}>
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
      <ErrorMessage message={error} />
    </section>
  );
}
