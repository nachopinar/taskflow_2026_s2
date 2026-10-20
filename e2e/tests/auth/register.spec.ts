import { VALID_PASSWORD, uniqueEmail } from '../../src/data/factories';
import { GUEST } from '../../src/fixtures/session';
import { expect, test } from '../../src/fixtures/test';

test.use({ storageState: GUEST });

test.describe('US-01 Registro de usuario', () => {
  test('registra la cuenta, inicia sesión y guarda el email en minúsculas', async ({
    page,
    loginPage,
  }) => {
    const email = uniqueEmail('Registro').replace('e2e-registro', 'E2E-Registro');
    await loginPage.goto();

    const response = await loginPage.register({ name: 'Ana', email, password: VALID_PASSWORD });

    expect(response.status()).toBe(201);
    await expect(page).toHaveURL('/projects');
    await expect(loginPage.header.userEmail).toHaveText(email.toLowerCase());
  });

  test('rechaza una contraseña débil indicando el requisito y no crea la cuenta', async ({
    page,
    api,
    loginPage,
  }) => {
    const email = uniqueEmail('debil');
    await loginPage.goto();

    const response = await loginPage.register({ email, password: 'abc' });

    expect(response.status()).toBe(400);
    await expect(loginPage.error).toContainText(/8 characters/i);
    await expect(page).toHaveURL('/login');
    expect((await api.attemptLogin(email, 'abc')).status()).toBe(401);
  });

  test('rechaza un email ya registrado aunque cambien las mayúsculas', async ({
    page,
    loginPage,
    createAccount,
  }) => {
    const existing = await createAccount('existente');
    await loginPage.goto();

    const response = await loginPage.register({
      email: existing.user.email.toUpperCase(),
      password: VALID_PASSWORD,
    });

    expect(response.status()).toBe(409);
    await expect(loginPage.error).toHaveText('Email already registered');
    await expect(page).toHaveURL('/login');
  });
});
