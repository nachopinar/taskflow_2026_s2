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

  test('rechaza asignar la tarea a alguien que ya no es miembro del proyecto', async ({
    ownerApi,
    project,
    createTask,
    createAccount,
    membersPage,
    taskDetailPage,
    boardPage,
  }) => {
    // Arrange: el select solo ofrece miembros conocidos por este navegador. Se agrega
    // desde la pantalla y se quita por API (como desde otro dispositivo), así el select
    // todavía lo ofrece y la que decide es la API.
    const formerMember = await createAccount('ex-miembro');
    const task = await createTask({ title: 'Tarea sin asignar' });
    await membersPage.goto(project.id);
    await membersPage.addMember(formerMember.user.email);
    await ownerApi.removeMember(project.id, formerMember.user.id);
    await taskDetailPage.goto(task);

    // Act
    const response = await taskDetailPage.edit({ assigneeLabel: formerMember.user.email });

    // Assert
    expect(response.status()).toBe(400);
    await expect(taskDetailPage.editError).toBeVisible();
    await boardPage.goto(project.id);
    await expect(boardPage.card(task.title).assignee).toHaveText('Sin asignar');
  });
});
