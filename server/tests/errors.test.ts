import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Propagación de errores', () => {
  it('un error del servicio llega al manejador JSON', async () => {
    const { token } = await registerUser('err1@test.com');
    const project = await createProject(token, 'Proyecto de errores');
    const task = await createTask(token, project.id, { title: 'Tarea válida' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ title: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'title must be between 3 and 200 characters',
        details: [],
      },
    });
  });

  it('un error del middleware llega al manejador JSON', async () => {
    const { token } = await registerUser('err2@test.com');

    const res = await request(app).get('/api/projects/proj-999999/tasks').set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Project not found');
  });

  it('el middleware rechaza a quien no es miembro', async () => {
    const a = await registerUser('err3a@test.com');
    const b = await registerUser('err3b@test.com');
    const project = await createProject(a.token, 'Proyecto de A');
    const task = await createTask(a.token, project.id, { title: 'Tarea de A' });

    const res = await request(app).get(`/api/tasks/${task.id}`).set(auth(b.token));

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not a member of this project');
  });
});
