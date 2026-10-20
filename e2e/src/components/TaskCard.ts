import { Locator } from '@playwright/test';

/** Tarjeta de tarea del tablero; se repite en las tres columnas. */
export class TaskCard {
  readonly title: Locator;
  readonly priority: Locator;
  readonly assignee: Locator;
  readonly dueDate: Locator;
  readonly statusSelect: Locator;

  constructor(readonly root: Locator) {
    this.title = root.getByTestId('task-card-title');
    this.priority = root.getByTestId('task-card-priority');
    this.assignee = root.getByTestId('task-card-assignee');
    this.dueDate = root.getByTestId('task-card-duedate');
    this.statusSelect = root.getByTestId('task-card-status-select');
  }

  async open(): Promise<void> {
    await this.title.click();
  }
}
