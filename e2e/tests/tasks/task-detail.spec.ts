import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-12 Editar tarea', () => {
  test('los cambios de título y prioridad se ven en el tablero', async ({
    api,
    owner,
    project,
    taskDetailPage,
    boardPage,
  }) => {
    const task = await api.as(owner).createTask(project.id, { title: 'Implementar login' });
    await taskDetailPage.goto(project.id, task.id);

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
    api,
    owner,
    project,
    page,
    taskDetailPage,
    boardPage,
  }) => {
    const task = await api.as(owner).createTask(project.id, { title: 'Creada por error' });
    await taskDetailPage.goto(project.id, task.id);

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
    async ({ api, owner, project, taskDetailPage }) => {
      const task = await api.as(owner).createTask(project.id, { title: 'Tarea con historial' });
      await taskDetailPage.goto(project.id, task.id);

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
