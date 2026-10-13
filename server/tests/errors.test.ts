import request from 'supertest';
import { apiError, app, auth, createProject, createTask, registerUser } from './helpers';

describe('Propagación de errores', () => {
  it('un error del servicio llega al manejador JSON', async () => {
    // Arrange
    const { token } = await registerUser('err1@test.com');
    const project = await createProject(token, 'Proyecto de errores');
    const task = await createTask(token, project.id, { title: 'Tarea válida' });

    // Act
    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ title: 'ab' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      apiError('VALIDATION_ERROR', 'title must be between 3 and 200 characters'),
    );
  });

  it('un error del middleware llega al manejador JSON', async () => {
    // Arrange
    const { token } = await registerUser('err2@test.com');

    // Act
    const res = await request(app).get('/api/projects/proj-999999/tasks').set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });

  it('el middleware rechaza a quien no es miembro', async () => {
    // Arrange
    const a = await registerUser('err3a@test.com');
    const b = await registerUser('err3b@test.com');
    const project = await createProject(a.token, 'Proyecto de A');
    const task = await createTask(a.token, project.id, { title: 'Tarea de A' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}`).set(auth(b.token));

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });
});
