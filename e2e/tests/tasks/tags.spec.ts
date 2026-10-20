import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';

test.describe('US-15 Etiquetar tareas', () => {
  test('agrega una etiqueta y la quita', async ({ api, owner, project, taskDetailPage }) => {
    const task = await api.as(owner).createTask(project.id, { title: 'Tarea a etiquetar' });
    await taskDetailPage.goto(project.id, task.id);

    const added = await taskDetailPage.addTag('backend');

    expect(added.status()).toBe(201);
    await expect(taskDetailPage.tagChips).toHaveCount(1);
    await expect(taskDetailPage.tag('backend').root).toBeVisible();

    const removed = await taskDetailPage.removeTag('backend');

    expect(removed.status()).toBe(204);
    await expect(taskDetailPage.tagChips).toHaveCount(0);
  });

  test(
    'guarda la etiqueta en minúsculas y sin espacios en los extremos',
    knownBug('Las etiquetas no se normalizan a minúsculas (US-15 AC1)'),
    async ({ api, owner, project, taskDetailPage }) => {
      const task = await api.as(owner).createTask(project.id, { title: 'Tarea a etiquetar' });
      await taskDetailPage.goto(project.id, task.id);

      await taskDetailPage.addTag('  Backend  ');

      await expect(taskDetailPage.tagChips.getByTestId('tag-chip-name')).toHaveText(['backend']);
    },
  );

  test(
    'no duplica una etiqueta que ya tiene, aunque cambien las mayúsculas',
    knownBug('Agregar una etiqueta existente (ignorando mayúsculas) crea un duplicado (US-15 AC2 y AC3)'),
    async ({ api, owner, project, taskDetailPage }) => {
      const task = await api.as(owner).createTask(project.id, { title: 'Tarea con bug' });
      await api.as(owner).addTag(task.id, 'bug');
      await taskDetailPage.goto(project.id, task.id);

      await taskDetailPage.addTag('BUG');

      await expect(taskDetailPage.tagChips.getByTestId('tag-chip-name')).toHaveText(['bug']);
    },
  );
});
