import type { Member } from '../../types';
import { MemberSelect, PrioritySelect } from './selects';

export interface TaskFieldValues {
  title: string;
  description: string;
  priority: string;
  assigneeId: string;
  dueDate: string;
}

export const EMPTY_TASK_FIELDS: TaskFieldValues = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  assigneeId: '',
  dueDate: '',
};

interface TaskFieldsProps {
  value: TaskFieldValues;
  onChange: (next: TaskFieldValues) => void;
  members: Member[];
  /** Prefijo de los data-testid: `task-create` en el tablero, `task` en el detalle. */
  testIdPrefix: string;
  descriptionAs?: 'input' | 'textarea';
  /** Muestra el responsable actual aunque no esté en la lista de miembros. */
  includeUnknownAssignee?: boolean;
}

export default function TaskFields({
  value,
  onChange,
  members,
  testIdPrefix,
  descriptionAs = 'input',
  includeUnknownAssignee = false,
}: TaskFieldsProps) {
  function set<K extends keyof TaskFieldValues>(key: K, next: TaskFieldValues[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <>
      <label className="field">
        <span>Título</span>
        <input
          type="text"
          data-testid={`${testIdPrefix}-title-input`}
          value={value.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </label>
      <label className="field">
        <span>Descripción</span>
        {descriptionAs === 'textarea' ? (
          <textarea
            data-testid={`${testIdPrefix}-description-input`}
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
          />
        ) : (
          <input
            type="text"
            data-testid={`${testIdPrefix}-description-input`}
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
          />
        )}
      </label>
      <label className="field">
        <span>Prioridad</span>
        <PrioritySelect
          testId={`${testIdPrefix}-priority-select`}
          value={value.priority}
          onChange={(v) => set('priority', v)}
        />
      </label>
      <label className="field">
        <span>Asignado</span>
        <MemberSelect
          testId={`${testIdPrefix}-assignee-select`}
          value={value.assigneeId}
          onChange={(v) => set('assigneeId', v)}
          members={members}
          emptyOption="Sin asignar"
          includeUnknown={includeUnknownAssignee}
        />
      </label>
      <label className="field">
        <span>Vencimiento</span>
        <input
          type="date"
          data-testid={`${testIdPrefix}-duedate-input`}
          value={value.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
        />
      </label>
    </>
  );
}
