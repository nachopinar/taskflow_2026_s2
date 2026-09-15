import { isStatus, Member, PRIORITIES, STATUSES } from '../../types';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  testId: string;
  /** Etiqueta de la opción vacía (value ""). Si se omite, no se muestra. */
  emptyOption?: string;
}

export function PrioritySelect({ value, onChange, testId, emptyOption }: SelectProps) {
  return (
    <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)}>
      {emptyOption !== undefined && <option value="">{emptyOption}</option>}
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

interface StatusSelectProps extends SelectProps {
  /** Muestra el valor actual como opción si no es un estado conocido. */
  includeUnknown?: boolean;
}

export function StatusSelect({
  value,
  onChange,
  testId,
  emptyOption,
  includeUnknown = false,
}: StatusSelectProps) {
  return (
    <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)}>
      {emptyOption !== undefined && <option value="">{emptyOption}</option>}
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      {includeUnknown && !isStatus(value) && <option value={value}>{value}</option>}
    </select>
  );
}

interface MemberSelectProps extends SelectProps {
  members: Member[];
  /** Muestra el valor actual como opción si no está entre los miembros. */
  includeUnknown?: boolean;
}

export function MemberSelect({
  value,
  onChange,
  testId,
  emptyOption,
  members,
  includeUnknown = false,
}: MemberSelectProps) {
  return (
    <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)}>
      {emptyOption !== undefined && <option value="">{emptyOption}</option>}
      {members.map((m) => (
        <option key={m.userId} value={m.userId}>
          {m.email || m.userId}
        </option>
      ))}
      {includeUnknown && value && !members.some((m) => m.userId === value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}
