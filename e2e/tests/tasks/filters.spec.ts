import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-07 Filtrar y buscar tareas', () => {
  test('filtra por prioridad', async ({ project, createTask, boardPage }) => {
    await createTask({ title: 'Urgente', priority: 'HIGH' });
    await createTask({ title: 'Puede esperar', priority: 'LOW' });
    await boardPage.goto(project.id);

    await boardPage.applyFilters({ priority: 'HIGH' });

    await expect(boardPage.cardTitles()).toHaveText(['Urgente']);
    await expect(boardPage.total).toHaveText('Total: 1');
  });

  test(
    'combina el filtro de prioridad con el de asignado',
    knownBug('Los filtros de GET /projects/:id/tasks no se combinan: el último pisa a los demás (US-07 AC5)'),
    async ({ owner, project, createTask, boardPage }) => {
      const mine = { assigneeId: owner.user.id };
      await createTask({ title: 'Alta y mía', priority: 'HIGH', ...mine });
      await createTask({ title: 'Alta sin asignar', priority: 'HIGH' });
      await createTask({ title: 'Baja y mía', priority: 'LOW', ...mine });
      await boardPage.goto(project.id);

      await boardPage.applyFilters({ priority: 'HIGH', assigneeId: owner.user.id });

      await expect(boardPage.cardTitles()).toHaveText(['Alta y mía']);
    },
  );

  test('busca por texto en el título', async ({ project, createTask, boardPage }) => {
    await createTask({ title: 'Implementar login' });
    await createTask({ title: 'Revisar diseño' });
    await boardPage.goto(project.id);

    await boardPage.applyFilters({ search: 'login' });

    await expect(boardPage.cardTitles()).toHaveText(['Implementar login']);
  });

  test(
    'la búsqueda no distingue mayúsculas de minúsculas',
    knownBug('La búsqueda por texto distingue mayúsculas de minúsculas (US-07 AC4)'),
    async ({ project, createTask, boardPage }) => {
      await createTask({ title: 'Implementar Login' });
      await boardPage.goto(project.id);

      await boardPage.applyFilters({ search: 'login' });

      await expect(boardPage.cardTitles()).toHaveText(['Implementar Login']);
    },
  );

  test(
    'un texto con comillas se busca como dato y no rompe el listado',
    knownBug('La búsqueda concatena el texto al SQL: un apóstrofe provoca un error 500 (RNF Seguridad 1)'),
    async ({ project, createTask, boardPage }) => {
      await createTask({ title: "Revisar el informe de O'Brien" });
      await boardPage.goto(project.id);

      await boardPage.applyFilters({ search: "O'Brien" });

      await expect(boardPage.listError).toHaveCount(0);
      await expect(boardPage.cardTitles()).toHaveText(["Revisar el informe de O'Brien"]);
    },
  );
});
