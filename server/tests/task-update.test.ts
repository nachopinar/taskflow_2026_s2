import request from 'supertest';
import {
  addMember,
  app,
  auth,
  createProject,
  createTask,
  registerUser,
  setStatus,
} from './helpers';

const FORBIDDEN_STATUS = 'Only the assignee or a project admin can change the status';

async function setup(prefix: string) {
  const owner = await registerUser(`${prefix}-owner@test.com`);
  const member = await registerUser(`${prefix}-member@test.com`);
  const project = await createProject(owner.token, `Proyecto ${prefix}`);
  await addMember(owner.token, project.id, `${prefix}-member@test.com`);
  return { owner, member, project };
}

async function historyOf(token: string, taskId: string) {
  const res = await request(app).get(`/api/tasks/${taskId}/history`).set(auth(token));
  return res.body as unknown[];
}

function patch(token: string, taskId: string, body: Record<string, unknown>) {
  return request(app).patch(`/api/tasks/${taskId}`).set(auth(token)).send(body);
}

describe('Actualizar tarea', () => {
  it('el asignado (MEMBER) avanza TODO -> IN_PROGRESS y se registra historial', async () => {
    const { owner, member, project } = await setup('upd1');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea asignada',
      assigneeId: member.id,
    });
    const before = await historyOf(member.token, task.id);

    const res = await patch(member.token, task.id, { status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
    const after = await historyOf(member.token, task.id);
    expect(after).toHaveLength(before.length + 1);
    expect(after[after.length - 1]).toMatchObject({
      changedBy: member.id,
      fromStatus: 'TODO',
      toStatus: 'IN_PROGRESS',
    });
  });

  it('un MEMBER no asignado no puede cambiar el estado', async () => {
    const { owner, member, project } = await setup('upd2');
    const task = await createTask(owner.token, project.id, { title: 'Tarea ajena' });

    const res = await patch(member.token, task.id, { status: 'IN_PROGRESS' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe(FORBIDDEN_STATUS);
  });

  it('el OWNER no asignado puede cambiar el estado', async () => {
    const { owner, member, project } = await setup('upd3');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea del miembro',
      assigneeId: member.id,
    });

    const res = await patch(owner.token, task.id, { status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('enviar el mismo estado es un no-op sin chequeo de permisos ni historial', async () => {
    const { owner, member, project } = await setup('upd4');
    const task = await createTask(owner.token, project.id, { title: 'Tarea sin cambios' });
    const before = await historyOf(member.token, task.id);

    const res = await patch(member.token, task.id, { status: 'TODO' });

    expect(res.status).toBe(200);
    expect(res.body.updatedAt).toBe(task.updatedAt);
    expect(await historyOf(member.token, task.id)).toHaveLength(before.length);
  });

  it('rechaza la transición DONE -> TODO del asignado', async () => {
    const { owner, member, project } = await setup('upd5');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea terminada',
      assigneeId: member.id,
    });
    await setStatus(member.token, task.id, 'IN_PROGRESS');
    const done = await setStatus(member.token, task.id, 'DONE');
    expect(done.status).toBe('DONE');

    const res = await patch(member.token, task.id, { status: 'TODO' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('rechaza un estado inválido con 400, venga de quien venga', async () => {
    const { owner, member, project } = await setup('upd6');
    const task = await createTask(owner.token, project.id, { title: 'Tarea banana' });

    const asOwner = await patch(owner.token, task.id, { status: 'BANANA' });
    const asMember = await patch(member.token, task.id, { status: 'BANANA' });

    expect(asOwner.status).toBe(400);
    expect(asMember.status).toBe(400);
  });

  it('valida el título antes que el permiso de estado', async () => {
    const { owner, member, project } = await setup('upd7');
    const task = await createTask(owner.token, project.id, { title: 'Orden de errores' });

    const res = await patch(member.token, task.id, { title: 'ab', status: 'DONE' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('title must be between 3 and 200 characters');
  });

  it('valida assigneeId al actualizar', async () => {
    const { owner, member, project } = await setup('upd8');
    const outsider = await registerUser('upd8-outsider@test.com');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea con asignado',
      assigneeId: member.id,
    });

    const invalid = await patch(owner.token, task.id, { assigneeId: 'user-x' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.message).toBe('assigneeId must be a valid user id');

    const nonMember = await patch(owner.token, task.id, { assigneeId: outsider.id });
    expect(nonMember.status).toBe(400);
    expect(nonMember.body.error.message).toBe('The assignee must be a member of the project');

    const cleared = await patch(owner.token, task.id, { assigneeId: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.assigneeId).toBeNull();
  });

  it('valida que el asignado sea miembro al crear', async () => {
    const { owner, project } = await setup('upd9');
    const outsider = await registerUser('upd9-outsider@test.com');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(owner.token))
      .send({ title: 'Tarea con extraño', assigneeId: outsider.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('The assignee must be a member of the project');
  });

  it('un body vacío devuelve la tarea sin modificar', async () => {
    const { owner, project } = await setup('upd10');
    const task = await createTask(owner.token, project.id, { title: 'Tarea intacta' });

    const res = await patch(owner.token, task.id, {});

    expect(res.status).toBe(200);
    expect(res.body.updatedAt).toBe(task.updatedAt);
  });
});
