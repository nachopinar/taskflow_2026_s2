import { Locator, Page } from '@playwright/test';

/** Header compartido por todas las pantallas con sesión. */
export class Header {
  readonly root: Locator;
  readonly userEmail: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('app-header');
    this.userEmail = this.root.getByTestId('header-user-email');
    this.logoutButton = this.root.getByTestId('logout-button');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
