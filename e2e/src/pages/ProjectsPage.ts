import { Locator, Page } from '@playwright/test';
import { ProjectCard } from '../components/ProjectCard';
import { BasePage, exactText } from './BasePage';

export class ProjectsPage extends BasePage {
  readonly root: Locator;
  readonly list: Locator;
  readonly cards: Locator;
  readonly emptyState: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly createError: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('projects-page');
    this.list = page.getByTestId('project-list');
    this.cards = this.list.getByTestId('project-card');
    this.emptyState = this.root.getByTestId('empty-state');
    this.nameInput = page.getByTestId('project-name-input');
    this.descriptionInput = page.getByTestId('project-description-input');
    this.createButton = page.getByTestId('project-create-submit');
    this.createError = this.root.locator(
      '[data-testid="project-create-form"] + [data-testid="error-message"]',
    );
  }

  /**
   * Navega y espera a que la lista termine de cargar: solo se monta cuando llegan
   * los datos. Se espera 'attached' porque una lista vacía no tiene tamaño visible.
   */
  async goto(): Promise<void> {
    await this.page.goto('/projects');
    await this.list.waitFor({ state: 'attached' });
  }

  async createProject(name: string, description?: string): Promise<void> {
    await this.nameInput.fill(name);
    if (description !== undefined) await this.descriptionInput.fill(description);
    await this.mutate(
      () => this.createButton.click(),
      { method: 'POST', path: '/api/projects' },
      { method: 'GET', path: '/api/projects' },
    );
  }

  card(name: string): ProjectCard {
    return new ProjectCard(
      this.cards.filter({
        has: this.page.getByTestId('project-card-name').filter({ hasText: exactText(name) }),
      }),
    );
  }
}
