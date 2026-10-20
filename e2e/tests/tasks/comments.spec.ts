import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-08 Comentar en una tarea', () => {
  test('publica un comentario propio en la tarea', async ({
    api,
    owner,
    project,
    taskDetailPage,
  }) => {
    const task = await api.as(owner).createTask(project.id, { title: 'Tarea a revisar' });
    await taskDetailPage.goto(project.id, task.id);

    const response = await taskDetailPage.addComment('Revisado y aprobado');

    expect(response.status()).toBe(201);
    await expect(taskDetailPage.comments).toHaveCount(1);
    await expect(taskDetailPage.comment('Revisado y aprobado').deleteButton).toBeVisible();
    await expect(taskDetailPage.commentInput).toHaveValue('');
  });

  test(
    'muestra los comentarios del más antiguo al más reciente',
    knownBug('GET /tasks/:id/comments devuelve los comentarios del más reciente al más antiguo (US-08 AC4)'),
    async ({ api, owner, project, taskDetailPage }) => {
      const ownerApi = api.as(owner);
      const task = await ownerApi.createTask(project.id, { title: 'Tarea conversada' });
      for (const body of ['Primero', 'Segundo', 'Tercero']) {
        await ownerApi.addComment(task.id, body);
      }

      await taskDetailPage.goto(project.id, task.id);

      await expect(taskDetailPage.commentBodies()).toHaveText(['Primero', 'Segundo', 'Tercero']);
    },
  );

  test('solo se pueden borrar los comentarios propios', async ({
    api,
    owner,
    project,
    taskDetailPage,
    createAccount,
  }) => {
    const member = await createAccount('miembro');
    const ownerApi = api.as(owner);
    await ownerApi.addMember(project.id, member.user.email);
    const task = await ownerApi.createTask(project.id, { title: 'Tarea compartida' });
    await api.as(member).addComment(task.id, 'Comentario del miembro');
    await ownerApi.addComment(task.id, 'Comentario del owner');
    await taskDetailPage.goto(project.id, task.id);

    await expect(taskDetailPage.comment('Comentario del miembro').deleteButton).toHaveCount(0);
    const response = await taskDetailPage.deleteComment('Comentario del owner');

    expect(response.status()).toBe(204);
    await expect(taskDetailPage.comment('Comentario del owner').root).toHaveCount(0);
    await expect(taskDetailPage.comment('Comentario del miembro').root).toBeVisible();
  });
});
