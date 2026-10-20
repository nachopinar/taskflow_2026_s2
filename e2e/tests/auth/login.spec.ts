import { VALID_PASSWORD, uniqueEmail } from '../../src/data/factories';
import { GUEST } from '../../src/fixtures/session';
import { expect, test } from '../../src/fixtures/test';

test.use({ storageState: GUEST });

test.describe('US-02 Login de usuario', () => {
  test('con credenciales válidas entra a sus proyectos con la sesión iniciada', async ({
    page,
    loginPage,
    createAccount,
  }) => {
    const account = await createAccount('login');
    await loginPage.goto();

    const response = await loginPage.login(account.user.email, account.password);

    expect(response.status()).toBe(200);
    await expect(page).toHaveURL('/projects');
    await expect(loginPage.header.userEmail).toHaveText(account.user.email);
  });

  test('muestra el mismo error para contraseña incorrecta y para email inexistente', async ({
    page,
    loginPage,
    createAccount,
  }) => {
    const account = await createAccount('login');
    await loginPage.goto();

    await loginPage.login(account.user.email, 'WrongPass9');
    await expect(loginPage.error).toBeVisible();
    const wrongPasswordMessage = await loginPage.error.innerText();
    await loginPage.login(uniqueEmail('nadie'), VALID_PASSWORD);

    await expect(loginPage.error).toHaveText(wrongPasswordMessage);
    await expect(page).toHaveURL('/login');
  });

  test('tras 5 intentos fallidos la cuenta se bloquea y rechaza las credenciales correctas', async ({
    page,
    api,
    loginPage,
    createAccount,
  }) => {
    const account = await createAccount('locked');
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await api.attemptLogin(account.user.email, 'WrongPass9');
      expect(res.status(), `intento fallido #${attempt}`).toBe(401);
    }
    await loginPage.goto();

    const response = await loginPage.login(account.user.email, account.password);

    expect(response.status()).toBe(401);
    await expect(loginPage.error).toContainText(/locked/i);
    await expect(page).toHaveURL('/login');
  });
});
