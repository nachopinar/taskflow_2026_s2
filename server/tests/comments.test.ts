import request from 'supertest';
import { ISO, app, auth, createProject, createTask, registerUser } from './helpers';

describe('Comentarios', () => {
  it('agrega un comentario a una tarea', async () => {
    // Arrange
    const { token, id } = await registerUser('com1@test.com');
    const project = await createProject(token, 'Proyecto con comentarios');
    const task = await createTask(token, project.id, { title: 'Tarea comentada' });

    // Act
    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Revisado y aprobado' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^comment-\d+$/),
      taskId: task.id,
      authorId: id,
      body: 'Revisado y aprobado',
      createdAt: ISO,
    });
  });

  it('devuelve los comentarios de una tarea', async () => {
    // Arrange
    const { token } = await registerUser('com2@test.com');
    const project = await createProject(token, 'Proyecto con listado');
    const task = await createTask(token, project.id, { title: 'Otra tarea' });
    const comment = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Primer comentario' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}/comments`).set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([comment.body]);
  });
});
