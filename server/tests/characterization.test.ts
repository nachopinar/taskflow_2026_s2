import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

// Tests de caracterización: registran el comportamiento actual (códigos y cuerpos)
// para que el refactor de la estructura de módulos no lo cambie.

const ISO = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/);

function apiError(code: string, message: string) {
  return { error: { code, message, details: [] } };
}

describe('Caracterización: proyectos', () => {
  let owner: { token: string; id: string };
  let member: { token: string; id: string };
  let outsider: { token: string; id: string };

  beforeAll(async () => {
    owner = await registerUser('char-owner@test.com');
    member = await registerUser('char-member@test.com');
    outsider = await registerUser('char-outsider@test.com');
  });

  async function projectWithMember(name: string) {
    const project = await createProject(owner.token, name);
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set(auth(owner.token))
      .send({ email: 'char-member@test.com' });
    return project;
  }

  it('POST /projects devuelve 201 con el proyecto serializado', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(owner.token))
      .send({ name: '  Caracterizado  ', description: 'Desc' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^proj-\d+$/),
      name: 'Caracterizado',
      description: 'Desc',
      ownerId: owner.id,
      archived: false,
      createdAt: ISO,
    });
  });

  it('POST /projects con nombre duplicado devuelve 409', async () => {
    await createProject(owner.token, 'Duplicado');
    const res = await request(app).post('/api/projects').set(auth(owner.token)).send({ name: 'Duplicado' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual(apiError('CONFLICT', 'You already have a project with that name'));
  });

  it('POST /projects con nombre de más de 100 caracteres devuelve 400', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(owner.token))
      .send({ name: 'x'.repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(apiError('VALIDATION_ERROR', 'name must be between 3 and 100 characters'));
  });

  it('POST /projects con nombre corto se acepta (bug conocido: sin validación de mínimo)', async () => {
    const res = await request(app).post('/api/projects').set(auth(owner.token)).send({ name: 'ab' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('ab');
  });

  it('POST /projects con description inválida devuelve 400', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(owner.token))
      .send({ name: 'Desc inválida', description: 5 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(apiError('VALIDATION_ERROR', 'description must be a string'));
  });

  it('GET /projects lista propios y aquellos donde es miembro', async () => {
    const project = await projectWithMember('Compartido para listar');
    const res = await request(app).get('/api/projects').set(auth(member.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: project.id,
        name: 'Compartido para listar',
        description: null,
        ownerId: owner.id,
        archived: false,
        createdAt: ISO,
      },
    ]);
  });

  it('PATCH /projects/:id del dueño devuelve 200 con el proyecto actualizado', async () => {
    const project = await createProject(owner.token, 'Para editar');
    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(owner.token))
      .send({ name: 'Editado', description: null });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...project, name: 'Editado', description: null });
  });

  it('PATCH /projects/:id valida mínimo y duplicados', async () => {
    const project = await createProject(owner.token, 'Validar edición');
    await createProject(owner.token, 'Nombre ocupado');

    const short = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(owner.token))
      .send({ name: 'ab' });
    expect(short.status).toBe(400);
    expect(short.body).toEqual(apiError('VALIDATION_ERROR', 'name must be between 3 and 100 characters'));

    const dup = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(owner.token))
      .send({ name: 'Nombre ocupado' });
    expect(dup.status).toBe(409);
    expect(dup.body).toEqual(apiError('CONFLICT', 'You already have a project with that name'));
  });

  it('PATCH /projects/:id devuelve 403 a miembros y 404 a no miembros', async () => {
    const project = await projectWithMember('Editar ajeno');

    const asMember = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(member.token))
      .send({ name: 'Nope' });
    expect(asMember.status).toBe(403);
    expect(asMember.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can edit it'));

    const asOutsider = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(auth(outsider.token))
      .send({ name: 'Nope' });
    expect(asOutsider.status).toBe(404);
    expect(asOutsider.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });

  it('PATCH /projects/:id con id inválido o inexistente devuelve 404', async () => {
    const bad = await request(app).patch('/api/projects/task-1').set(auth(owner.token)).send({});
    expect(bad.status).toBe(404);
    expect(bad.body).toEqual(apiError('NOT_FOUND', 'Project not found'));

    const missing = await request(app).patch('/api/projects/proj-99999').set(auth(owner.token)).send({});
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });

  it('DELETE /projects/:id devuelve 403 a miembros, 404 a no miembros y 204 al dueño', async () => {
    const project = await projectWithMember('Borrar');

    const asMember = await request(app).delete(`/api/projects/${project.id}`).set(auth(member.token));
    expect(asMember.status).toBe(403);
    expect(asMember.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can delete it'));

    const asOutsider = await request(app).delete(`/api/projects/${project.id}`).set(auth(outsider.token));
    expect(asOutsider.status).toBe(404);
    expect(asOutsider.body).toEqual(apiError('NOT_FOUND', 'Project not found'));

    const asOwner = await request(app).delete(`/api/projects/${project.id}`).set(auth(owner.token));
    expect(asOwner.status).toBe(204);
    expect(asOwner.text).toBe('');

    const again = await request(app).delete(`/api/projects/${project.id}`).set(auth(owner.token));
    expect(again.status).toBe(404);
  });

  it('POST /projects/:id/members agrega un miembro', async () => {
    const project = await createProject(owner.token, 'Agregar miembro');
    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set(auth(owner.token))
      .send({ email: '  CHAR-MEMBER@test.com ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      projectId: project.id,
      userId: member.id,
      email: 'char-member@test.com',
      role: 'MEMBER',
    });
  });

  it('POST /projects/:id/members: errores de permisos y validación', async () => {
    const project = await projectWithMember('Errores de miembros');
    const post = (token: string, body: object) =>
      request(app).post(`/api/projects/${project.id}/members`).set(auth(token)).send(body);

    const asMember = await post(member.token, { email: 'char-outsider@test.com' });
    expect(asMember.status).toBe(403);
    expect(asMember.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can manage members'));

    const asOutsider = await post(outsider.token, { email: 'char-outsider@test.com' });
    expect(asOutsider.status).toBe(403);
    expect(asOutsider.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can manage members'));

    const badEmail = await post(owner.token, { email: 'no-es-email' });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body).toEqual(apiError('VALIDATION_ERROR', 'email must be a valid address'));

    const noUser = await post(owner.token, { email: 'nadie@test.com' });
    expect(noUser.status).toBe(404);
    expect(noUser.body).toEqual(apiError('NOT_FOUND', 'No user found with that email'));

    const existing = await post(owner.token, { email: 'char-member@test.com' });
    expect(existing.status).toBe(409);
    expect(existing.body).toEqual(apiError('CONFLICT', 'User is already a member of this project'));

    const missing = await request(app)
      .post('/api/projects/proj-99999/members')
      .set(auth(owner.token))
      .send({ email: 'char-member@test.com' });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });

  it('DELETE /projects/:id/members/:userId: errores y éxito', async () => {
    const project = await projectWithMember('Quitar miembro');
    const del = (token: string, userId: string) =>
      request(app).delete(`/api/projects/${project.id}/members/${userId}`).set(auth(token));

    const asMember = await del(member.token, member.id);
    expect(asMember.status).toBe(403);
    expect(asMember.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can manage members'));

    const removeOwner = await del(owner.token, owner.id);
    expect(removeOwner.status).toBe(400);
    expect(removeOwner.body).toEqual(
      apiError('VALIDATION_ERROR', 'The project owner cannot be removed from the project'),
    );

    const notMember = await del(owner.token, outsider.id);
    expect(notMember.status).toBe(404);
    expect(notMember.body).toEqual(apiError('NOT_FOUND', 'User is not a member of this project'));

    const badId = await del(owner.token, 'proj-1');
    expect(badId.status).toBe(404);
    expect(badId.body).toEqual(apiError('NOT_FOUND', 'Project not found'));

    const ok = await del(owner.token, member.id);
    expect(ok.status).toBe(204);
    expect(ok.text).toBe('');
  });
});

describe('Caracterización: comentarios', () => {
  let author: { token: string; id: string };
  let other: { token: string; id: string };
  let outsider: { token: string; id: string };
  let taskId: string;

  beforeAll(async () => {
    author = await registerUser('char-author@test.com');
    other = await registerUser('char-other@test.com');
    outsider = await registerUser('char-com-outsider@test.com');
    const project = await createProject(author.token, 'Proyecto comentarios char');
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set(auth(author.token))
      .send({ email: 'char-other@test.com' });
    taskId = (await createTask(author.token, project.id, { title: 'Tarea char' })).id;
  });

  it('POST /tasks/:id/comments devuelve 201 con el comentario', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set(auth(author.token))
      .send({ body: '  Hola  ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^comment-\d+$/),
      taskId,
      authorId: author.id,
      body: 'Hola',
      createdAt: ISO,
    });
  });

  it('POST /tasks/:id/comments valida el cuerpo', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set(auth(author.token))
      .send({ body: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      apiError('VALIDATION_ERROR', 'Comment body must be between 1 and 1000 characters'),
    );
  });

  it('GET /tasks/:id/comments lista del más nuevo al más viejo', async () => {
    await request(app).post(`/api/tasks/${taskId}/comments`).set(auth(other.token)).send({ body: 'Último' });
    const res = await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(author.token));

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toEqual({
      id: expect.stringMatching(/^comment-\d+$/),
      taskId,
      authorId: other.id,
      body: 'Último',
      createdAt: ISO,
    });
  });

  it('comentarios: 403 a no miembros y 404 para tareas inexistentes', async () => {
    const list = await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(outsider.token));
    expect(list.status).toBe(403);
    expect(list.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));

    const create = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set(auth(outsider.token))
      .send({ body: 'x' });
    expect(create.status).toBe(403);

    const missing = await request(app).get('/api/tasks/task-99999/comments').set(auth(author.token));
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  it('DELETE /comments/:id: 404, 403 a otro autor y 204 al autor', async () => {
    const created = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set(auth(author.token))
      .send({ body: 'Para borrar' });

    const missing = await request(app).delete('/api/comments/comment-99999').set(auth(author.token));
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(apiError('NOT_FOUND', 'Comment not found'));

    const badId = await request(app).delete('/api/comments/task-1').set(auth(author.token));
    expect(badId.status).toBe(404);
    expect(badId.body).toEqual(apiError('NOT_FOUND', 'Comment not found'));

    const asOther = await request(app).delete(`/api/comments/${created.body.id}`).set(auth(other.token));
    expect(asOther.status).toBe(403);
    expect(asOther.body).toEqual(apiError('FORBIDDEN', 'You can only delete your own comments'));

    const ok = await request(app).delete(`/api/comments/${created.body.id}`).set(auth(author.token));
    expect(ok.status).toBe(204);
    expect(ok.text).toBe('');
  });

  it('DELETE /comments/:id sin token devuelve 401', async () => {
    const res = await request(app).delete('/api/comments/comment-1');
    expect(res.status).toBe(401);
  });
});

describe('Caracterización: tareas (partes que se mueven al repositorio)', () => {
  let owner: { token: string; id: string };
  let projectId: string;

  beforeAll(async () => {
    owner = await registerUser('char-tasks@test.com');
    projectId = (await createProject(owner.token, 'Proyecto tareas char')).id;
  });

  it('GET /projects/:id/tasks incluye assignee y commentCount', async () => {
    const task = await createTask(owner.token, projectId, { title: 'Con asignado', assigneeId: owner.id });
    await createTask(owner.token, projectId, { title: 'Sin asignado' });
    await request(app).post(`/api/tasks/${task.id}/comments`).set(auth(owner.token)).send({ body: 'c' });

    const res = await request(app).get(`/api/projects/${projectId}/tasks`).set(auth(owner.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, limit: 20, offset: 0 });
    expect(res.body.items[0]).toEqual({
      ...task,
      assignee: { id: owner.id, email: 'char-tasks@test.com' },
      commentCount: 1,
    });
    expect(res.body.items[1]).toMatchObject({ title: 'Sin asignado', assignee: null, commentCount: 0 });
  });

  it('GET /tasks/:id incluye tags y GET /tasks/:id/history lista cambios', async () => {
    const task = await createTask(owner.token, projectId, { title: 'Con tags', assigneeId: owner.id });
    const tag = await request(app).post(`/api/tasks/${task.id}/tags`).set(auth(owner.token)).send({ name: 'ui' });
    await request(app).patch(`/api/tasks/${task.id}`).set(auth(owner.token)).send({ status: 'IN_PROGRESS' });

    const one = await request(app).get(`/api/tasks/${task.id}`).set(auth(owner.token));
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ id: task.id, status: 'IN_PROGRESS', tags: [tag.body] });

    const history = await request(app).get(`/api/tasks/${task.id}/history`).set(auth(owner.token));
    expect(history.status).toBe(200);
    expect(history.body).toEqual([
      { id: expect.any(Number), taskId: task.id, changedBy: owner.id, fromStatus: null, toStatus: 'TODO', changedAt: ISO },
      {
        id: expect.any(Number),
        taskId: task.id,
        changedBy: owner.id,
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        changedAt: ISO,
      },
    ]);

    const missing = await request(app).get('/api/tasks/task-99999').set(auth(owner.token));
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  it('DELETE /tasks/:id borra y luego devuelve 404', async () => {
    const task = await createTask(owner.token, projectId, { title: 'Borrable' });
    const ok = await request(app).delete(`/api/tasks/${task.id}`).set(auth(owner.token));
    expect(ok.status).toBe(204);

    const again = await request(app).delete(`/api/tasks/${task.id}`).set(auth(owner.token));
    expect(again.status).toBe(404);
    expect(again.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });
});

describe('Caracterización: auth', () => {
  it('register, login, forgot y reset devuelven los códigos actuales', async () => {
    const reg = await request(app).post('/api/auth/register').send({ email: 'char-auth@test.com', password: 'Password1' });
    expect(reg.status).toBe(201);
    expect(reg.body).toEqual({
      user: { id: expect.stringMatching(/^user-\d+$/), email: 'char-auth@test.com', name: null, createdAt: ISO },
      token: expect.any(String),
    });

    const dup = await request(app).post('/api/auth/register').send({ email: 'char-auth@test.com', password: 'Password1' });
    expect(dup.status).toBe(409);
    expect(dup.body).toEqual(apiError('CONFLICT', 'Email already registered'));

    const login = await request(app).post('/api/auth/login').send({ email: 'char-auth@test.com', password: 'Password1' });
    expect(login.status).toBe(200);

    const badLogin = await request(app).post('/api/auth/login').send({ email: 'char-auth@test.com', password: 'nope' });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body).toEqual(apiError('UNAUTHORIZED', 'Invalid credentials'));

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'char-auth@test.com' });
    expect(forgot.status).toBe(200);
    expect(forgot.body).toEqual({ message: 'Password reset requested', token: expect.any(String) });

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.token, newPassword: 'Newpass12' });
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ message: 'Password updated' });

    const badReset = await request(app).post('/api/auth/reset-password').send({ token: 'x', newPassword: 'Newpass12' });
    expect(badReset.status).toBe(400);
    expect(badReset.body).toEqual(apiError('VALIDATION_ERROR', 'Invalid or expired reset token'));
  });
});
