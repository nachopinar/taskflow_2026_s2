import type { Account, Project, Task } from '../../src/api/types';
import { TaskflowApi } from '../../src/api/TaskflowApi';
import { uniqueEmail } from '../../src/data/factories';
import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';
import { BoardPage } from '../../src/pages/BoardPage';
import { MembersPage } from '../../src/pages/MembersPage';
import { ProjectsPage } from '../../src/pages/ProjectsPage';

/**
 * Deja a `member` en el proyecto con una tarea asignada. La pantalla de miembros
 * no tiene un endpoint para listarlos: muestra al owner y a quienes tienen tareas
 * asignadas, así que la tarea es lo que hace visible al miembro en esa pantalla.
 */
async function memberWithAssignedTask(
  api: TaskflowApi,
  owner: Account,
  project: Project,
  member: Account,
): Promise<Task> {
  await api.as(owner).addMember(project.id, member.user.email);
  return api
    .as(owner)
    .createTask(project.id, { title: 'Tarea del miembro', assigneeId: member.user.id });
}

test.describe('US-11 Agregar/quitar miembros de un proyecto', () => {
  test('el owner agrega un miembro por email y el miembro pasa a ver el proyecto', async ({
    membersPage,
    project,
    createAccount,
    openPageAs,
  }) => {
    const member = await createAccount('miembro');
    await membersPage.goto(project.id);

    await membersPage.addMember(member.user.email);

    await expect(membersPage.member(member.user.email).role).toHaveText('MEMBER');
    const memberProjects = new ProjectsPage(await openPageAs(member));
    await memberProjects.goto();
    await expect(memberProjects.card(project.name).root).toBeVisible();
  });

  test('informa el error si no existe un usuario con ese email', async ({
    membersPage,
    project,
  }) => {
    const unknownEmail = uniqueEmail('inexistente');
    await membersPage.goto(project.id);

    await membersPage.addMember(unknownEmail);

    await expect(membersPage.error).toHaveText('No user found with that email');
    await expect(membersPage.member(unknownEmail).root).toHaveCount(0);
  });

  test('un miembro que no es owner no puede administrar los miembros', async ({
    api,
    owner,
    project,
    createAccount,
    openPageAs,
  }) => {
    const member = await createAccount('miembro');
    await api.as(owner).addMember(project.id, member.user.email);
    const memberView = new MembersPage(await openPageAs(member));

    await memberView.goto(project.id);

    await expect(memberView.readonlyNote).toBeVisible();
    await expect(memberView.addForm).toHaveCount(0);
  });

  test('un miembro quitado deja de ver el proyecto', async ({
    api,
    owner,
    project,
    membersPage,
    createAccount,
    openPageAs,
  }) => {
    const member = await createAccount('miembro');
    await memberWithAssignedTask(api, owner, project, member);
    await membersPage.goto(project.id);

    const response = await membersPage.removeMember(member.user.email);

    expect(response.status()).toBe(204);
    await expect(membersPage.member(member.user.email).root).toHaveCount(0);
    const memberProjects = new ProjectsPage(await openPageAs(member));
    await memberProjects.goto();
    await expect(memberProjects.card(project.name).root).toHaveCount(0);
  });

  test(
    'al quitar un miembro sus tareas quedan sin asignar',
    knownBug('DELETE /projects/:id/members/:userId no libera las tareas asignadas (US-11 AC6)'),
    async ({ api, owner, project, page, membersPage, createAccount }) => {
      const member = await createAccount('miembro');
      const task = await memberWithAssignedTask(api, owner, project, member);
      await membersPage.goto(project.id);

      await membersPage.removeMember(member.user.email);

      const board = new BoardPage(page);
      await board.goto(project.id);
      await expect(board.card(task.title).assignee).toHaveText('Sin asignar');
    },
  );
});
