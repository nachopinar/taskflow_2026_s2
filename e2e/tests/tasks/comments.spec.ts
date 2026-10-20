import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-08 Comentar en una tarea', () => {
  test('publica un comentario propio en la tarea', async ({ createTask, taskDetailPage }) => {
    const task = await createTask({ title: 'Tarea a revisar' });
    await taskDetailPage.goto(task);

    const response = await taskDetailPage.addComment('Revisado y aprobado');

    expect(response.status()).toBe(201);
    await expect(taskDetailPage.comments).toHaveCount(1);
    await expect(taskDetailPage.comment('Revisado y aprobado').deleteButton).toBeVisible();
    await expect(taskDetailPage.commentInput).toHaveValue('');
  });

  test(
    'muestra los comentarios del más antiguo al más reciente',
    knownBug('GET /tasks/:id/comments devuelve los comentarios del más reciente al más antiguo (US-08 AC4)'),
    async ({ ownerApi, createTask, taskDetailPage }) => {
      const task = await createTask({ title: 'Tarea conversada' });
      for (const body of ['Primero', 'Segundo', 'Tercero']) {
        await ownerApi.addComment(task.id, body);
      }

      await taskDetailPage.goto(task);

      await expect(taskDetailPage.commentBodies()).toHaveText(['Primero', 'Segundo', 'Tercero']);
    },
  );

  test('solo se pueden borrar los comentarios propios', async ({
    api,
    ownerApi,
    member,
    createTask,
    taskDetailPage,
  }) => {
    const task = await createTask({ title: 'Tarea compartida' });
    await api.as(member).addComment(task.id, 'Comentario del miembro');
    await ownerApi.addComment(task.id, 'Comentario del owner');
    await taskDetailPage.goto(task);

    await expect(taskDetailPage.comment('Comentario del miembro').deleteButton).toHaveCount(0);
    const response = await taskDetailPage.deleteComment('Comentario del owner');

    expect(response.status()).toBe(204);
    await expect(taskDetailPage.comment('Comentario del owner').root).toHaveCount(0);
    await expect(taskDetailPage.comment('Comentario del miembro').root).toBeVisible();
  });
});
