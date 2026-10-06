import request from 'supertest';
import { ISO, app, auth, createProject, createTask, registerUser } from './helpers';

describe('Tareas', () => {
  it('crea una tarea en un proyecto', async () => {
    // Arrange
    const { token } = await registerUser('task1@test.com');
    const project = await createProject(token, 'Proyecto de tareas');

    // Act
    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Implementar login', priority: 'HIGH' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^task-\d+$/),
      projectId: project.id,
      title: 'Implementar login',
      description: null,
      status: 'TODO',
      priority: 'HIGH',
      assigneeId: null,
      dueDate: null,
      createdAt: ISO,
      updatedAt: ISO,
    });
  });

  it('avanza una tarea de TODO a IN_PROGRESS', async () => {
    // Arrange
    const { token, id } = await registerUser('task2@test.com');
    const project = await createProject(token, 'Proyecto de estados');
    const task = await createTask(token, project.id, { title: 'Tarea con estados', assigneeId: id });

    // Act
    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, status: 'IN_PROGRESS', updatedAt: ISO });
  });

  it('filtra las tareas por estado', async () => {
    // Arrange
    const { token } = await registerUser('task3@test.com');
    const project = await createProject(token, 'Proyecto de filtros');
    const first = await createTask(token, project.id, { title: 'Primera tarea' });
    const second = await createTask(token, project.id, { title: 'Segunda tarea' });

    // Act
    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?status=TODO`)
      .set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, limit: 20, offset: 0 });
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items).toEqual(
      expect.arrayContaining([
        { ...first, assignee: null, commentCount: 0 },
        { ...second, assignee: null, commentCount: 0 },
      ]),
    );
  });
});
