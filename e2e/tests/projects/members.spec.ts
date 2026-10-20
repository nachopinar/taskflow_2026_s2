import { uniqueEmail } from '../../src/data/factories';
import { expect, test } from '../../src/fixtures/test';
import { knownBug } from '../../src/known-bugs';
import { MembersPage } from '../../src/pages/MembersPage';
import { ProjectsPage } from '../../src/pages/ProjectsPage';

test.describe('US-11 Agregar/quitar miembros de un proyecto', () => {
  test('el owner agrega un miembro por email y el miembro pasa a ver el proyecto', async ({
    membersPage,
    project,
    createAccount,
    openPageAs,
  }) => {
    const newMember = await createAccount('miembro');
    await membersPage.goto(project.id);

    await membersPage.addMember(newMember.user.email);

    await expect(membersPage.member(newMember.user.email).role).toHaveText('MEMBER');
    const memberProjects = new ProjectsPage(await openPageAs(newMember));
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
    project,
    member,
    openPageAs,
  }) => {
    const memberView = new MembersPage(await openPageAs(member));

    await memberView.goto(project.id);

    await expect(memberView.readonlyNote).toBeVisible();
    await expect(memberView.addForm).toHaveCount(0);
  });

  // La pantalla de miembros no tiene un endpoint para listarlos: muestra al owner
  // y a quienes tienen tareas asignadas. La tarea asignada hace visible al miembro.
  test.describe('con una tarea asignada al miembro', () => {
    const MEMBER_TASK = 'Tarea del miembro';

    test.beforeEach(async ({ project, member, createTask, membersPage }) => {
      await createTask({ title: MEMBER_TASK, assigneeId: member.user.id });
      await membersPage.goto(project.id);
    });

    test('un miembro quitado deja de ver el proyecto', async ({
      project,
      member,
      membersPage,
      openPageAs,
    }) => {
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
      async ({ project, member, membersPage, boardPage }) => {
        await membersPage.removeMember(member.user.email);

        await boardPage.goto(project.id);
        await expect(boardPage.card(MEMBER_TASK).assignee).toHaveText('Sin asignar');
      },
    );
  });
});
