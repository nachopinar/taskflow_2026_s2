import { Locator } from '@playwright/test';

export class ProjectCard {
  readonly name: Locator;
  readonly description: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('project-card-name');
    this.description = root.getByTestId('project-card-description');
  }
}
