import { expect, test } from '../../src/fixtures/test';
import { GUEST } from '../../src/fixtures/session';

test.describe('Sesión', () => {
  test.describe('sin sesión', () => {
    test.use({ storageState: GUEST });

    test('una ruta protegida redirige al login', async ({ page, loginPage }) => {
      await page.goto('/projects');

      await expect(page).toHaveURL('/login');
      await expect(loginPage.root).toBeVisible();
    });
  });

  test('cerrar sesión vuelve al login y la ruta protegida deja de estar accesible', async ({
    page,
    projectsPage,
    loginPage,
  }) => {
    await projectsPage.goto();

    await projectsPage.header.logout();

    await expect(page).toHaveURL('/login');
    await page.goto('/projects');
    await expect(page).toHaveURL('/login');
    await expect(loginPage.root).toBeVisible();
  });
});
