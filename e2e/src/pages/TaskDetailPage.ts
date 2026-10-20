import { Locator, Page, Response } from '@playwright/test';
import type { Priority, Status } from '../api/types';
import { CommentItem } from '../components/CommentItem';
import { TagChip } from '../components/TagChip';
import { BasePage, exactText } from './BasePage';

export interface TaskEdit {
  title?: string;
  priority?: Priority;
  /** Etiqueta visible de la opción ('Sin asignar' o el email del miembro). */
  assigneeLabel?: string;
  /** 'YYYY-MM-DD', o '' para quitar la fecha. */
  dueDate?: string;
}

/** Detalle de tarea: edición, estado, etiquetas, comentarios e historial. */
export class TaskDetailPage extends BasePage {
  readonly root: Locator;
  readonly titleInput: Locator;
  readonly prioritySelect: Locator;
  readonly assigneeSelect: Locator;
  readonly dueDateInput: Locator;
  readonly dueDateValue: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly editError: Locator;
  readonly statusSelect: Locator;
  readonly statusSubmit: Locator;
  readonly currentStatus: Locator;
  readonly statusError: Locator;
  readonly tagChips: Locator;
  readonly tagInput: Locator;
  readonly tagAddButton: Locator;
  readonly tagsError: Locator;
  readonly comments: Locator;
  readonly commentInput: Locator;
  readonly commentAddButton: Locator;
  readonly historyItems: Locator;
  private taskId = '';

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('task-detail-page');
    this.titleInput = page.getByTestId('task-title-input');
    this.prioritySelect = page.getByTestId('task-priority-select');
    this.assigneeSelect = page.getByTestId('task-assignee-select');
    this.dueDateInput = page.getByTestId('task-duedate-input');
    this.dueDateValue = page.getByTestId('task-duedate-value');
    this.saveButton = page.getByTestId('task-save-button');
    this.deleteButton = page.getByTestId('task-delete-button');
    this.editError = page.getByTestId('task-edit-form').getByTestId('error-message');
    this.statusSelect = page.getByTestId('task-status-select');
    this.statusSubmit = page.getByTestId('task-status-submit');
    this.currentStatus = page.getByTestId('task-current-status');
    this.statusError = page.locator(
      '[data-testid="task-status-form"] + [data-testid="error-message"]',
    );
    this.tagChips = page.getByTestId('tag-list').getByTestId('tag-chip');
    this.tagInput = page.getByTestId('tag-add-input');
    this.tagAddButton = page.getByTestId('tag-add-button');
    this.tagsError = page.getByTestId('task-tags-section').getByTestId('error-message');
    this.comments = page.getByTestId('comment-list').getByTestId('comment-item');
    this.commentInput = page.getByTestId('comment-add-input');
    this.commentAddButton = page.getByTestId('comment-add-button');
    this.historyItems = page.getByTestId('history-list').getByTestId('history-item');
  }

  private get taskPath(): string {
    return `/api/tasks/${this.taskId}`;
  }

  /** Espera la tarea y los comentarios: hasta entonces la página muestra 'Cargando…'. */
  private async waitUntilLoaded(): Promise<void> {
    await this.root.waitFor();
    await this.loading.waitFor({ state: 'hidden' });
  }

  async goto(projectId: string, taskId: string): Promise<void> {
    this.taskId = taskId;
    await this.page.goto(`/projects/${projectId}/tasks/${taskId}`);
    await this.waitUntilLoaded();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitUntilLoaded();
  }

  async edit(changes: TaskEdit): Promise<Response> {
    if (changes.title !== undefined) await this.titleInput.fill(changes.title);
    if (changes.priority) await this.prioritySelect.selectOption(changes.priority);
    if (changes.assigneeLabel !== undefined) {
      await this.assigneeSelect.selectOption({ label: changes.assigneeLabel });
    }
    if (changes.dueDate !== undefined) await this.dueDateInput.fill(changes.dueDate);
    return this.mutate(() => this.saveButton.click(), { method: 'PATCH', path: this.taskPath });
  }

  async deleteTask(): Promise<Response> {
    return this.mutate(() => this.deleteButton.click(), { method: 'DELETE', path: this.taskPath });
  }

  /** Cambia el estado desde el formulario del detalle y espera la recarga del historial. */
  async changeStatus(status: Status): Promise<Response> {
    await this.statusSelect.selectOption(status);
    return this.mutate(
      () => this.statusSubmit.click(),
      { method: 'PATCH', path: this.taskPath },
      { method: 'GET', path: `${this.taskPath}/history` },
    );
  }

  /** Al agregar una etiqueta la página recarga la tarea completa y vuelve a montar las secciones. */
  async addTag(name: string): Promise<Response> {
    await this.tagInput.fill(name);
    const response = await this.mutate(
      () => this.tagAddButton.click(),
      { method: 'POST', path: `${this.taskPath}/tags` },
      { method: 'GET', path: this.taskPath },
    );
    await this.waitUntilLoaded();
    return response;
  }

  async removeTag(name: string): Promise<Response> {
    const response = await this.mutate(
      () => this.tag(name).removeButton.click(),
      { method: 'DELETE', path: new RegExp(`^${this.taskPath}/tags/`) },
      { method: 'GET', path: this.taskPath },
    );
    await this.waitUntilLoaded();
    return response;
  }

  tag(name: string): TagChip {
    return new TagChip(
      this.tagChips.filter({
        has: this.page.getByTestId('tag-chip-name').filter({ hasText: exactText(name) }),
      }),
    );
  }

  async addComment(body: string): Promise<Response> {
    await this.commentInput.fill(body);
    return this.mutate(
      () => this.commentAddButton.click(),
      { method: 'POST', path: `${this.taskPath}/comments` },
      { method: 'GET', path: `${this.taskPath}/comments` },
    );
  }

  async deleteComment(body: string): Promise<Response> {
    return this.mutate(
      () => this.comment(body).deleteButton.click(),
      { method: 'DELETE', path: /^\/api\/comments\/[^/]+$/ },
      { method: 'GET', path: `${this.taskPath}/comments` },
    );
  }

  comment(body: string): CommentItem {
    return new CommentItem(
      this.comments.filter({
        has: this.page.getByTestId('comment-item-body').filter({ hasText: exactText(body) }),
      }),
    );
  }

  commentBodies(): Locator {
    return this.comments.getByTestId('comment-item-body');
  }
}
