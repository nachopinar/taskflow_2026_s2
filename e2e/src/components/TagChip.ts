import { Locator } from '@playwright/test';

export class TagChip {
  readonly name: Locator;
  readonly removeButton: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('tag-chip-name');
    this.removeButton = root.getByTestId('tag-remove-button');
  }
}
