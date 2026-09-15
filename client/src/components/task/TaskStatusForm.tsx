import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAsyncAction } from '../../lib/asyncAction';
import { ErrorMessage } from '../../lib/ui';
import type { Task } from '../../types';
import { StatusSelect } from './selects';

interface TaskStatusFormProps {
  task: Task;
  onChanged: (task: Task) => Promise<void>;
}

export default function TaskStatusForm({ task, onChanged }: TaskStatusFormProps) {
  const [status, setStatus] = useState<string>(task.status);
  const { run, error } = useAsyncAction();

  useEffect(() => {
    setStatus(task.status);
  }, [task]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const updated = await api<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: { status },
      });
      await onChanged(updated);
    }, 'No se pudo cambiar el estado');
  }

  return (
    <>
      <form className="form form-inline" data-testid="task-status-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Estado</span>
          <StatusSelect testId="task-status-select" value={status} onChange={setStatus} />
        </label>
        <button type="submit" data-testid="task-status-submit">
          Cambiar estado
        </button>
        <span data-testid="task-current-status">{task.status}</span>
      </form>
      <ErrorMessage message={error} />
    </>
  );
}
