import { expect, test } from '../../src/fixtures/test';

test.describe('US-14 Asignar tarea a un miembro', () => {
  test('el owner suma un miembro y le asigna una tarea sin cambiar su estado', async ({
    project,
    createTask,
    membersPage,
    taskDetailPage,
    boardPage,
    createAccount,
  }) => {
    const newMember = await createAccount('miembro');
    const task = await createTask({ title: 'Tarea para asignar' });
    await membersPage.goto(project.id);
    await membersPage.addMember(newMember.user.email);
    await taskDetailPage.goto(task);

    const response = await taskDetailPage.edit({ assigneeLabel: newMember.user.email });

    expect(response.status()).toBe(200);
    await boardPage.goto(project.id);
    await expect(boardPage.card(task.title, 'TODO').assignee).toHaveText(newMember.user.email);
  });

  test('desasigna una tarea', async ({
    owner,
    project,
    createTask,
    taskDetailPage,
    boardPage,
  }) => {
    const task = await createTask({ title: 'Tarea asignada', assigneeId: owner.user.id });
    await taskDetailPage.goto(task);

    await taskDetailPage.edit({ assigneeLabel: 'Sin asignar' });

    await boardPage.goto(project.id);
    await expect(boardPage.card(task.title).assignee).toHaveText('Sin asignar');
  });
});
