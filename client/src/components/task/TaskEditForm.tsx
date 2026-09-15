import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAsyncAction } from '../../lib/asyncAction';
import { toUpdateBody } from '../../lib/taskBody';
import { ErrorMessage } from '../../lib/ui';
import type { Member, Task } from '../../types';
import TaskFields, { TaskFieldValues } from './TaskFields';

function fieldsFrom(task: Task): TaskFieldValues {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    assigneeId: task.assigneeId ?? '',
    dueDate: task.dueDate ?? '',
  };
}

interface TaskEditFormProps {
  task: Task;
  members: Member[];
  onSaved: (task: Task) => void;
  onDeleted: () => void;
}

export default function TaskEditForm({ task, members, onSaved, onDeleted }: TaskEditFormProps) {
  const [fields, setFields] = useState<TaskFieldValues>(() => fieldsFrom(task));
  const { run, busy: saving, error } = useAsyncAction();

  // Cada vez que la página recibe una tarea nueva, el formulario se resincroniza.
  useEffect(() => {
    setFields(fieldsFrom(task));
  }, [task]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const updated = await api<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: toUpdateBody(fields),
      });
      onSaved(updated);
    }, 'No se pudo guardar la tarea');
  }

  async function onDelete() {
    await run(
      async () => {
        await api(`/tasks/${task.id}`, { method: 'DELETE' });
        onDeleted();
      },
      'No se pudo borrar la tarea',
      { trackBusy: false },
    );
  }

  return (
    <form className="form" data-testid="task-edit-form" onSubmit={onSave}>
      <TaskFields
        value={fields}
        onChange={setFields}
        members={members}
        testIdPrefix="task"
        descriptionAs="textarea"
        includeUnknownAssignee
      />
      <p className="field-value">
        Vencimiento actual: <span data-testid="task-duedate-value">{task.dueDate ?? '—'}</span>
      </p>
      <ErrorMessage message={error} />
      <div className="form-actions">
        <button type="submit" data-testid="task-save-button" disabled={saving}>
          Guardar
        </button>
        <button type="button" data-testid="task-delete-button" onClick={onDelete}>
          Borrar tarea
        </button>
      </div>
    </form>
  );
}
