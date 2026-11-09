import { Locator, Page, Response } from '@playwright/test';
import { BasePage } from './BasePage';

/** Pantalla de login, con el toggle para pasar al formulario de registro. */
export class LoginPage extends BasePage {
  readonly root: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly modeToggle: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('login-page');
    this.nameInput = page.getByTestId('login-name-input');
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit');
    this.modeToggle = page.getByTestId('login-mode-toggle');
    this.error = this.root.getByTestId('error-message');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.root.waitFor();
  }

  /** Devuelve la respuesta del login para que cada intento se evalúe por separado. */
  async login(email: string, password: string): Promise<Response> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    return this.read(() => this.submitButton.click(), {
      method: 'POST',
      path: '/api/auth/login',
    });
  }

  async register(data: { name?: string; email: string; password: string }): Promise<Response> {
    await this.modeToggle.click();
    if (data.name) await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    return this.read(() => this.submitButton.click(), {
      method: 'POST',
      path: '/api/auth/register',
    });
  }
}
