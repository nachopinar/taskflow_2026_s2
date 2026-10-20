import { expect, test } from '../../src/fixtures/test';
import { BoardPage } from '../../src/pages/BoardPage';
import { TaskDetailPage } from '../../src/pages/TaskDetailPage';

test.describe('US-14 Asignar tarea a un miembro', () => {
  test('el owner suma un miembro y le asigna una tarea sin cambiar su estado', async ({
    api,
    owner,
    project,
    page,
    membersPage,
    createAccount,
  }) => {
    const member = await createAccount('miembro');
    const task = await api.as(owner).createTask(project.id, { title: 'Tarea para asignar' });
    await membersPage.goto(project.id);
    await membersPage.addMember(member.user.email);
    const detail = new TaskDetailPage(page);
    await detail.goto(project.id, task.id);

    const response = await detail.edit({ assigneeLabel: member.user.email });

    expect(response.status()).toBe(200);
    const board = new BoardPage(page);
    await board.goto(project.id);
    await expect(board.card(task.title, 'TODO').assignee).toHaveText(member.user.email);
  });

  test('desasigna una tarea', async ({ api, owner, project, taskDetailPage, boardPage }) => {
    const task = await api
      .as(owner)
      .createTask(project.id, { title: 'Tarea asignada', assigneeId: owner.user.id });
    await taskDetailPage.goto(project.id, task.id);

    await taskDetailPage.edit({ assigneeLabel: 'Sin asignar' });

    await boardPage.goto(project.id);
    await expect(boardPage.card(task.title).assignee).toHaveText('Sin asignar');
  });
});
