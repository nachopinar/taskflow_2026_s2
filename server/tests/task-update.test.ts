import request from 'supertest';
import {
  ISO,
  addMember,
  apiError,
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

function history(token: string, taskId: string) {
  return request(app).get(`/api/tasks/${taskId}/history`).set(auth(token));
}

function patch(token: string, taskId: string, body: Record<string, unknown>) {
  return request(app).patch(`/api/tasks/${taskId}`).set(auth(token)).send(body);
}

describe('Actualizar tarea', () => {
  it('el asignado (MEMBER) avanza TODO -> IN_PROGRESS', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd1');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea asignada',
      assigneeId: member.id,
    });

    // Act
    const res = await patch(member.token, task.id, { status: 'IN_PROGRESS' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, status: 'IN_PROGRESS', updatedAt: ISO });
  });

  it('el cambio de estado queda registrado en el historial', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd1b');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea con historial',
      assigneeId: member.id,
    });
    await setStatus(member.token, task.id, 'IN_PROGRESS');

    // Act
    const res = await history(member.token, task.id);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: expect.any(Number),
        taskId: task.id,
        changedBy: owner.id,
        fromStatus: null,
        toStatus: 'TODO',
        changedAt: ISO,
      },
      {
        id: expect.any(Number),
        taskId: task.id,
        changedBy: member.id,
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        changedAt: ISO,
      },
    ]);
  });

  it('un MEMBER no asignado no puede cambiar el estado', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd2');
    const task = await createTask(owner.token, project.id, { title: 'Tarea ajena' });

    // Act
    const res = await patch(member.token, task.id, { status: 'IN_PROGRESS' });

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', FORBIDDEN_STATUS));
  });

  it('el OWNER no asignado puede cambiar el estado', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd3');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea del miembro',
      assigneeId: member.id,
    });

    // Act
    const res = await patch(owner.token, task.id, { status: 'IN_PROGRESS' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, status: 'IN_PROGRESS', updatedAt: ISO });
  });

  it('enviar el mismo estado es un no-op sin chequeo de permisos', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd4');
    const task = await createTask(owner.token, project.id, { title: 'Tarea sin cambios' });

    // Act
    const res = await patch(member.token, task.id, { status: 'TODO' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual(task);
  });

  it('enviar el mismo estado no agrega entradas al historial', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd4b');
    const task = await createTask(owner.token, project.id, { title: 'Tarea sin historial nuevo' });
    await setStatus(member.token, task.id, 'TODO');

    // Act
    const res = await history(member.token, task.id);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: expect.any(Number),
        taskId: task.id,
        changedBy: owner.id,
        fromStatus: null,
        toStatus: 'TODO',
        changedAt: ISO,
      },
    ]);
  });

  it('rechaza la transición DONE -> TODO del asignado', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd5');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea terminada',
      assigneeId: member.id,
    });
    await setStatus(member.token, task.id, 'IN_PROGRESS');
    await setStatus(member.token, task.id, 'DONE');

    // Act
    const res = await patch(member.token, task.id, { status: 'TODO' });

    // Assert
    expect(res.status).toBe(422);
    expect(res.body).toEqual(
      apiError('INVALID_TRANSITION', 'Cannot move a task from DONE to TODO'),
    );
  });

  it('rechaza un estado inválido del owner con 400', async () => {
    // Arrange
    const { owner, project } = await setup('upd6');
    const task = await createTask(owner.token, project.id, { title: 'Tarea banana' });

    // Act
    const res = await patch(owner.token, task.id, { status: 'BANANA' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR', details: [] } });
  });

  it('rechaza un estado inválido de un miembro no asignado con 400', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd6b');
    const task = await createTask(owner.token, project.id, { title: 'Tarea banana ajena' });

    // Act
    const res = await patch(member.token, task.id, { status: 'BANANA' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR', details: [] } });
  });

  it('valida el título antes que el permiso de estado', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd7');
    const task = await createTask(owner.token, project.id, { title: 'Orden de errores' });

    // Act
    const res = await patch(member.token, task.id, { title: 'ab', status: 'DONE' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      apiError('VALIDATION_ERROR', 'title must be between 3 and 200 characters'),
    );
  });

  it('rechaza un assigneeId malformado al actualizar', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd8');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea con asignado',
      assigneeId: member.id,
    });

    // Act
    const res = await patch(owner.token, task.id, { assigneeId: 'user-x' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(apiError('VALIDATION_ERROR', 'assigneeId must be a valid user id'));
  });

  it('rechaza asignar a quien no es miembro al actualizar', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd8b');
    const outsider = await registerUser('upd8b-outsider@test.com');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea con asignado',
      assigneeId: member.id,
    });

    // Act
    const res = await patch(owner.token, task.id, { assigneeId: outsider.id });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      apiError('VALIDATION_ERROR', 'The assignee must be a member of the project'),
    );
  });

  it('permite quitar el asignado con assigneeId null', async () => {
    // Arrange
    const { owner, member, project } = await setup('upd8c');
    const task = await createTask(owner.token, project.id, {
      title: 'Tarea con asignado',
      assigneeId: member.id,
    });

    // Act
    const res = await patch(owner.token, task.id, { assigneeId: null });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, assigneeId: null, updatedAt: ISO });
  });

  it('valida que el asignado sea miembro al crear', async () => {
    // Arrange
    const { owner, project } = await setup('upd9');
    const outsider = await registerUser('upd9-outsider@test.com');

    // Act
    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(owner.token))
      .send({ title: 'Tarea con extraño', assigneeId: outsider.id });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      apiError('VALIDATION_ERROR', 'The assignee must be a member of the project'),
    );
  });

  it('un body vacío devuelve la tarea sin modificar', async () => {
    // Arrange
    const { owner, project } = await setup('upd10');
    const task = await createTask(owner.token, project.id, { title: 'Tarea intacta' });

    // Act
    const res = await patch(owner.token, task.id, {});

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual(task);
  });
});
