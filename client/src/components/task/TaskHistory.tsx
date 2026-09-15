import type { HistoryEntry } from '../../types';

export default function TaskHistory({ entries }: { entries: HistoryEntry[] }) {
  return (
    <section className="section" data-testid="task-history-section">
      <h2>Historial de estados</h2>
      <ul className="history-list" data-testid="history-list">
        {entries.map((entry) => (
          <li key={entry.id} className="history-item" data-testid="history-item">
            {entry.fromStatus ?? '—'} → {entry.toStatus} · {entry.changedAt}
          </li>
        ))}
      </ul>
    </section>
  );
}
