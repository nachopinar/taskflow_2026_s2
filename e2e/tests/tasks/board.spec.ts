import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-05 Crear tarea en un proyecto', () => {
  test('la tarea creada aparece en la columna TODO con su prioridad', async ({
    boardPage,
    project,
  }) => {
    await boardPage.goto(project.id);

    const response = await boardPage.createTask({ title: 'Implementar login', priority: 'HIGH' });

    expect(response.status()).toBe(201);
    const card = boardPage.card('Implementar login', 'TODO');
    await expect(card.root).toBeVisible();
    await expect(card.priority).toHaveText('HIGH');
    await expect(boardPage.total).toHaveText('Total: 1');
  });

  test('rechaza un título de menos de 3 caracteres', async ({ boardPage, project }) => {
    await boardPage.goto(project.id);

    await boardPage.createTask({ title: 'ab' });

    await expect(boardPage.createError).toContainText('between 3 and 200 characters');
    await expect(boardPage.cards).toHaveCount(0);
  });
});

test.describe('US-06 Cambiar estado de una tarea', () => {
  test('mueve la tarea de TODO a IN_PROGRESS desde el tablero', async ({
    project,
    createTask,
    boardPage,
  }) => {
    const task = await createTask({ title: 'Tarea a empezar' });
    await boardPage.goto(project.id);

    await boardPage.changeStatus(task.title, 'IN_PROGRESS');

    await expect(boardPage.card(task.title, 'IN_PROGRESS').root).toBeVisible();
    await expect(boardPage.card(task.title, 'TODO').root).toHaveCount(0);
  });

  test(
    'no permite pasar de TODO a DONE directamente',
    knownBug('PATCH /tasks/:id acepta la transición TODO → DONE (US-06 AC2)'),
    async ({ project, createTask, boardPage }) => {
      const task = await createTask({ title: 'Tarea sin empezar' });
      await boardPage.goto(project.id);

      await boardPage.changeStatus(task.title, 'DONE');

      await expect(boardPage.listError).toBeVisible();
      await expect(boardPage.card(task.title, 'TODO').root).toBeVisible();
    },
  );

  test('no permite reabrir una tarea DONE', async ({
    ownerApi,
    project,
    createTask,
    boardPage,
  }) => {
    const task = await createTask({ title: 'Tarea terminada' });
    await ownerApi.updateTask(task.id, { status: 'IN_PROGRESS' });
    await ownerApi.updateTask(task.id, { status: 'DONE' });
    await boardPage.goto(project.id);

    await boardPage.changeStatus(task.title, 'TODO');

    await expect(boardPage.listError).toContainText('Cannot move a task from DONE to TODO');
    await expect(boardPage.card(task.title, 'DONE').root).toBeVisible();
  });
});
