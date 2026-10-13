import request from 'supertest';
import { apiError, app, auth, createProject, createTask, registerUser } from './helpers';

describe('Ids de ruta', () => {
  it('sin token, un id malformado da 401 y no 404', async () => {
    // Arrange
    const url = '/api/tasks/garbage';

    // Act
    const res = await request(app).get(url);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
  });

  it('un id de proyecto malformado da 404', async () => {
    // Arrange
    const { token } = await registerUser('ids1@test.com');

    // Act
    const res = await request(app)
      .patch('/api/projects/proj-x')
      .set(auth(token))
      .send({ name: 'Nombre nuevo' });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });

  it('un id de tarea malformado da 404', async () => {
    // Arrange
    const { token } = await registerUser('ids2@test.com');

    // Act
    const res = await request(app).get('/api/tasks/task-x').set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  it('un id de comentario malformado da 404', async () => {
    // Arrange
    const { token } = await registerUser('ids3@test.com');

    // Act
    const res = await request(app).delete('/api/comments/comment-x').set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Comment not found'));
  });

  it('un id con prefijo equivocado da 404', async () => {
    // Arrange
    const { token } = await registerUser('ids4@test.com');

    // Act
    const res = await request(app).get('/api/tasks/proj-1').set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  it('acepta un id numérico sin prefijo', async () => {
    // Arrange
    const { token } = await registerUser('ids5@test.com');
    const project = await createProject(token, 'Proyecto numérico');
    const task = await createTask(token, project.id, { title: 'Tarea numérica' });

    // Act
    const res = await request(app)
      .get(`/api/tasks/${task.id.replace('task-', '')}`)
      .set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, tags: [] });
  });

  it('la ruta anidada de tareas resuelve el id del proyecto', async () => {
    // Arrange
    const { token } = await registerUser('ids6@test.com');
    const project = await createProject(token, 'Proyecto anidado');
    const task = await createTask(token, project.id, { title: 'Tarea anidada' });

    // Act
    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [{ ...task, assignee: null, commentCount: 0 }],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('la ruta anidada de comentarios resuelve el id de la tarea', async () => {
    // Arrange
    const { token } = await registerUser('ids6b@test.com');
    const project = await createProject(token, 'Proyecto anidado de comentarios');
    const task = await createTask(token, project.id, { title: 'Tarea anidada' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}/comments`).set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('un no miembro con un tagId malformado recibe 403 y no 404', async () => {
    // Arrange
    const a = await registerUser('ids7a@test.com');
    const b = await registerUser('ids7b@test.com');
    const project = await createProject(a.token, 'Proyecto con tags');
    const task = await createTask(a.token, project.id, { title: 'Tarea con tags' });

    // Act
    const res = await request(app).delete(`/api/tasks/${task.id}/tags/tag-x`).set(auth(b.token));

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });

  it('un userId malformado al quitar un miembro da 404 Project not found', async () => {
    // Arrange
    const { token } = await registerUser('ids8@test.com');
    const project = await createProject(token, 'Proyecto con miembros');

    // Act
    const res = await request(app)
      .delete(`/api/projects/${project.id}/members/user-x`)
      .set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });
});
