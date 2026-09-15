import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Ids de ruta', () => {
  it('sin token, un id malformado da 401 y no 404', async () => {
    const res = await request(app).get('/api/tasks/garbage');

    expect(res.status).toBe(401);
  });

  it('un id de proyecto malformado da 404', async () => {
    const { token } = await registerUser('ids1@test.com');

    const res = await request(app)
      .patch('/api/projects/proj-x')
      .set(auth(token))
      .send({ name: 'Nombre nuevo' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Project not found');
  });

  it('un id de tarea malformado da 404', async () => {
    const { token } = await registerUser('ids2@test.com');

    const res = await request(app).get('/api/tasks/task-x').set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task not found');
  });

  it('un id de comentario malformado da 404', async () => {
    const { token } = await registerUser('ids3@test.com');

    const res = await request(app).delete('/api/comments/comment-x').set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Comment not found');
  });

  it('un id con prefijo equivocado da 404', async () => {
    const { token } = await registerUser('ids4@test.com');

    const res = await request(app).get('/api/tasks/proj-1').set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task not found');
  });

  it('acepta un id numérico sin prefijo', async () => {
    const { token } = await registerUser('ids5@test.com');
    const project = await createProject(token, 'Proyecto numérico');
    const task = await createTask(token, project.id, { title: 'Tarea numérica' });

    const res = await request(app)
      .get(`/api/tasks/${task.id.replace('task-', '')}`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
  });

  it('las rutas anidadas resuelven el id del padre', async () => {
    const { token } = await registerUser('ids6@test.com');
    const project = await createProject(token, 'Proyecto anidado');
    const task = await createTask(token, project.id, { title: 'Tarea anidada' });

    const tasks = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(token));
    const comments = await request(app).get(`/api/tasks/${task.id}/comments`).set(auth(token));

    expect(tasks.status).toBe(200);
    expect(tasks.body.items).toHaveLength(1);
    expect(comments.status).toBe(200);
  });

  it('un no miembro con un tagId malformado recibe 403 y no 404', async () => {
    const a = await registerUser('ids7a@test.com');
    const b = await registerUser('ids7b@test.com');
    const project = await createProject(a.token, 'Proyecto con tags');
    const task = await createTask(a.token, project.id, { title: 'Tarea con tags' });

    const res = await request(app).delete(`/api/tasks/${task.id}/tags/tag-x`).set(auth(b.token));

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('You are not a member of this project');
  });

  it('un userId malformado al quitar un miembro da 404 Project not found', async () => {
    const { token } = await registerUser('ids8@test.com');
    const project = await createProject(token, 'Proyecto con miembros');

    const res = await request(app)
      .delete(`/api/projects/${project.id}/members/user-x`)
      .set(auth(token));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Project not found');
  });
});
