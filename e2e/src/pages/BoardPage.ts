import { Locator, Page, Response } from '@playwright/test';
import type { Priority, Status } from '@client/types';
import type { NewTask } from '../api/types';
import { TaskCard } from '../components/TaskCard';
import { BasePage } from './BasePage';

export interface BoardFilters {
  priority?: Priority;
  /** userId del asignado (valor del select, no la etiqueta). */
  assigneeId?: string;
  search?: string;
}

/** Tablero de un proyecto: alta de tareas, filtros y columnas por estado. */
export class BoardPage extends BasePage {
  readonly root: Locator;
  readonly projectName: Locator;
  readonly total: Locator;
  readonly cards: Locator;
  readonly createTitleInput: Locator;
  readonly createPrioritySelect: Locator;
  readonly createButton: Locator;
  readonly createError: Locator;
  readonly filterPrioritySelect: Locator;
  readonly filterAssigneeSelect: Locator;
  readonly filterSearchInput: Locator;
  readonly filterApplyButton: Locator;
  readonly listError: Locator;
  private projectId = '';

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('board-page');
    this.projectName = page.getByTestId('board-project-name');
    this.total = page.getByTestId('board-total');
    this.cards = this.root.getByTestId('task-card');
    this.createTitleInput = page.getByTestId('task-create-title-input');
    this.createPrioritySelect = page.getByTestId('task-create-priority-select');
    this.createButton = page.getByTestId('task-create-submit');
    this.createError = this.errorAfter('task-create-form');
    this.filterPrioritySelect = page.getByTestId('filter-priority-select');
    this.filterAssigneeSelect = page.getByTestId('filter-assignee-select');
    this.filterSearchInput = page.getByTestId('filter-search-input');
    this.filterApplyButton = page.getByTestId('filter-apply-button');
    this.listError = this.errorAfter('board-total');
  }

  private get tasksPath(): string {
    return `/api/projects/${this.projectId}/tasks`;
  }

  async goto(projectId: string): Promise<void> {
    this.projectId = projectId;
    await this.page.goto(`/projects/${projectId}`);
    await this.waitUntilLoaded();
  }

  async createTask(task: Pick<NewTask, 'title' | 'priority'>): Promise<Response> {
    await this.createTitleInput.fill(task.title);
    if (task.priority) await this.createPrioritySelect.selectOption(task.priority);
    const response = await this.mutate(
      () => this.createButton.click(),
      { method: 'POST', path: this.tasksPath },
      { method: 'GET', path: this.tasksPath },
    );
    await this.waitUntilLoaded();
    return response;
  }

  async applyFilters(filters: BoardFilters): Promise<Response> {
    if (filters.priority) await this.filterPrioritySelect.selectOption(filters.priority);
    if (filters.assigneeId) await this.filterAssigneeSelect.selectOption(filters.assigneeId);
    if (filters.search) await this.filterSearchInput.fill(filters.search);
    const response = await this.read(() => this.filterApplyButton.click(), {
      method: 'GET',
      path: this.tasksPath,
    });
    await this.waitUntilLoaded();
    return response;
  }

  /** Cambia el estado desde el select de la tarjeta, como haría el usuario en el tablero. */
  async changeStatus(title: string, status: Status): Promise<Response> {
    const card = this.card(title);
    const response = await this.mutate(
      () => card.statusSelect.selectOption(status),
      { method: 'PATCH', path: /^\/api\/tasks\/[^/]+$/ },
      { method: 'GET', path: this.tasksPath },
    );
    await this.waitUntilLoaded();
    return response;
  }

  column(status: Status): Locator {
    return this.root.getByTestId(`board-column-${status}`);
  }

  /** Tarjeta por título; con `status` se busca solo dentro de esa columna. */
  card(title: string, status?: Status): TaskCard {
    const scope = status ? this.column(status).getByTestId('task-card') : this.cards;
    return new TaskCard(this.itemWithText(scope, 'task-card-title', title));
  }

  cardTitles(): Locator {
    return new TaskCard(this.cards).title;
  }
}
