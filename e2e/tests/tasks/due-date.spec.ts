import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

// La suite corre con servidor y navegador en America/Montevideo (UTC-3), ver src/config/env.ts.
const TZ_BUG = 'La fecha de vencimiento se corre un día cuando el servidor no está en UTC (US-16 AC3)';

test.describe('US-16 Fecha de vencimiento de tarea', () => {
  test(
    'la fecha cargada se muestra igual en el detalle y en el tablero',
    knownBug(TZ_BUG),
    async ({ api, owner, project, taskDetailPage, boardPage }) => {
      const task = await api.as(owner).createTask(project.id, { title: 'Con vencimiento' });
      await taskDetailPage.goto(project.id, task.id);

      await taskDetailPage.edit({ dueDate: '2026-09-15' });

      await expect(taskDetailPage.dueDateValue).toHaveText('2026-09-15');
      await boardPage.goto(project.id);
      await expect(boardPage.card(task.title).dueDate).toHaveText('2026-09-15');
    },
  );

  test('se puede quitar la fecha de vencimiento', async ({
    api,
    owner,
    project,
    taskDetailPage,
    boardPage,
  }) => {
    const task = await api
      .as(owner)
      .createTask(project.id, { title: 'Vencimiento a quitar', dueDate: '2026-09-15' });
    await taskDetailPage.goto(project.id, task.id);

    await taskDetailPage.edit({ dueDate: '' });

    await expect(taskDetailPage.dueDateValue).toHaveText('—');
    await boardPage.goto(project.id);
    await expect(boardPage.card(task.title).dueDate).toHaveText('—');
  });

  test(
    'editar el título no modifica la fecha de vencimiento',
    knownBug(`${TZ_BUG}. Cada guardado desde el detalle la corre un día más.`),
    async ({ api, owner, project, taskDetailPage }) => {
      const task = await api
        .as(owner)
        .createTask(project.id, { title: 'Título original', dueDate: '2026-09-15' });
      await taskDetailPage.goto(project.id, task.id);
      const dueDateBefore = await taskDetailPage.dueDateValue.innerText();

      await taskDetailPage.edit({ title: 'Título corregido' });
      await taskDetailPage.reload();

      await expect(taskDetailPage.titleInput).toHaveValue('Título corregido');
      await expect(taskDetailPage.dueDateValue).toHaveText(dueDateBefore);
    },
  );
});
