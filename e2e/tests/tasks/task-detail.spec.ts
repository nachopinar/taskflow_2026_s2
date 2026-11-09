import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-12 Editar tarea', () => {
  test('los cambios de título y prioridad se ven en el tablero', async ({
    project,
    createTask,
    taskDetailPage,
    boardPage,
  }) => {
    const task = await createTask({ title: 'Implementar login' });
    await taskDetailPage.goto(task);

    const response = await taskDetailPage.edit({
      title: 'Implementar login con OAuth',
      priority: 'CRITICAL',
    });

    expect(response.status()).toBe(200);
    await boardPage.goto(project.id);
    await expect(boardPage.card('Implementar login', 'TODO').root).toHaveCount(0);
    await expect(boardPage.card('Implementar login con OAuth', 'TODO').priority).toHaveText(
      'CRITICAL',
    );
  });
});

test.describe('US-13 Eliminar tarea', () => {
  test('al borrar la tarea vuelve al tablero y la tarea ya no está', async ({
    project,
    page,
    createTask,
    taskDetailPage,
    boardPage,
  }) => {
    const task = await createTask({ title: 'Creada por error' });
    await taskDetailPage.goto(task);

    const response = await taskDetailPage.deleteTask();

    expect(response.status()).toBe(204);
    await expect(page).toHaveURL(`/projects/${project.id}`);
    await boardPage.waitUntilLoaded();
    await expect(boardPage.total).toHaveText('Total: 0');
    await expect(boardPage.card(task.title).root).toHaveCount(0);
  });
});

test.describe('US-06 Historial de estados', () => {
  test(
    'registra exactamente las transiciones aplicadas',
    knownBug('Crear una tarea agrega una entrada "— → TODO" al historial de estados (US-06, escenario de historial)'),
    async ({ createTask, taskDetailPage }) => {
      const task = await createTask({ title: 'Tarea con historial' });
      await taskDetailPage.goto(task);

      await taskDetailPage.changeStatus('IN_PROGRESS');
      await taskDetailPage.changeStatus('DONE');

      await expect(taskDetailPage.currentStatus).toHaveText('DONE');
      await expect(taskDetailPage.historyItems).toHaveText([
        /^TODO → IN_PROGRESS · /,
        /^IN_PROGRESS → DONE · /,
      ]);
    },
  );
});
