import { uniqueName } from '../../src/data/factories';
import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-03 Crear proyecto', () => {
  test('el proyecto creado aparece en la lista con su descripción', async ({ projectsPage }) => {
    const name = uniqueName('Mi Proyecto');
    await projectsPage.goto();

    await projectsPage.createProject(name, 'Descripción del proyecto');

    const card = projectsPage.card(name);
    await expect(card.root).toBeVisible();
    await expect(card.description).toHaveText('Descripción del proyecto');
  });

  test(
    'rechaza un nombre de menos de 3 caracteres',
    knownBug('POST /projects acepta nombres de menos de 3 caracteres (US-03 AC1)'),
    async ({ projectsPage }) => {
      await projectsPage.goto();

      await projectsPage.createProject('ab');

      await expect(projectsPage.createError).toContainText('between 3 and 100 characters');
      await expect(projectsPage.card('ab').root).toHaveCount(0);
    },
  );
});

test.describe('US-04 Listar proyectos del usuario', () => {
  test('muestra los proyectos propios y no los de otros usuarios', async ({
    api,
    projectsPage,
    project,
    createAccount,
  }) => {
    const stranger = await createAccount('ajeno');
    const foreignProject = await api.as(stranger).createProject(uniqueName('Proyecto ajeno'));

    await projectsPage.goto();

    await expect(projectsPage.card(project.name).root).toBeVisible();
    await expect(projectsPage.card(foreignProject.name).root).toHaveCount(0);
  });

  test('un usuario sin proyectos ve la lista vacía sin errores', async ({ projectsPage }) => {
    await projectsPage.goto();

    await expect(projectsPage.emptyState).toBeVisible();
    await expect(projectsPage.cards).toHaveCount(0);
  });
});
