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

// Tests de caracterización: registran el comportamiento actual (códigos y cuerpos)
// para que el refactor de la estructura de módulos no lo cambie.

type User = { token: string; id: string };

describe('Caracterización: proyectos', () => {
  let owner: User;
  let member: User;
  let outsider: User;

  beforeAll(async () => {
    owner = await registerUser('char-owner@test.com');
    member = await registerUser('char-member@test.com');
    outsider = await registerUser('char-outsider@test.com');
  });

  async function projectWithMember(name: string) {
    const project = await createProject(owner.token, name);
    await addMember(owner.token, project.id, 'char-member@test.com');
    return project;
  }

  describe('POST /projects', () => {
    it('devuelve 201 con el proyecto serializado', async () => {
      // Arrange
      const body = { name: '  Caracterizado  ', description: 'Desc' };

      // Act
      const res = await request(app).post('/api/projects').set(auth(owner.token)).send(body);

      // Assert
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

    it('con nombre duplicado devuelve 409', async () => {
      // Arrange
      await createProject(owner.token, 'Duplicado');

      // Act
      const res = await request(app)
        .post('/api/projects')
        .set(auth(owner.token))
        .send({ name: 'Duplicado' });

      // Assert
      expect(res.status).toBe(409);
      expect(res.body).toEqual(apiError('CONFLICT', 'You already have a project with that name'));
    });

    it('con nombre de más de 100 caracteres devuelve 400', async () => {
      // Arrange
      const body = { name: 'x'.repeat(101) };

      // Act
      const res = await request(app).post('/api/projects').set(auth(owner.token)).send(body);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        apiError('VALIDATION_ERROR', 'name must be between 3 and 100 characters'),
      );
    });

    it('con nombre corto se acepta (bug conocido: sin validación de mínimo)', async () => {
      // Arrange
      const body = { name: 'ab' };

      // Act
      const res = await request(app).post('/api/projects').set(auth(owner.token)).send(body);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.stringMatching(/^proj-\d+$/),
        name: 'ab',
        description: null,
        ownerId: owner.id,
        archived: false,
        createdAt: ISO,
      });
    });

    it('con description inválida devuelve 400', async () => {
      // Arrange
      const body = { name: 'Desc inválida', description: 5 };

      // Act
      const res = await request(app).post('/api/projects').set(auth(owner.token)).send(body);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual(apiError('VALIDATION_ERROR', 'description must be a string'));
    });
  });

  describe('GET /projects', () => {
    it('lista propios y aquellos donde es miembro', async () => {
      // Arrange
      const project = await projectWithMember('Compartido para listar');

      // Act
      const res = await request(app).get('/api/projects').set(auth(member.token));

      // Assert
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
  });

  describe('PATCH /projects/:id', () => {
    const patch = (token: string, projectId: string, body: object) =>
      request(app).patch(`/api/projects/${projectId}`).set(auth(token)).send(body);

    it('del dueño devuelve 200 con el proyecto actualizado', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Para editar');

      // Act
      const res = await patch(owner.token, project.id, { name: 'Editado', description: null });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...project, name: 'Editado', description: null });
    });

    it('con nombre de menos de 3 caracteres devuelve 400', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Validar mínimo');

      // Act
      const res = await patch(owner.token, project.id, { name: 'ab' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        apiError('VALIDATION_ERROR', 'name must be between 3 and 100 characters'),
      );
    });

    it('con nombre duplicado devuelve 409', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Validar duplicado');
      await createProject(owner.token, 'Nombre ocupado');

      // Act
      const res = await patch(owner.token, project.id, { name: 'Nombre ocupado' });

      // Assert
      expect(res.status).toBe(409);
      expect(res.body).toEqual(apiError('CONFLICT', 'You already have a project with that name'));
    });

    it('devuelve 403 a un miembro que no es dueño', async () => {
      // Arrange
      const project = await projectWithMember('Editar como miembro');

      // Act
      const res = await patch(member.token, project.id, { name: 'Nope' });

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can edit it'));
    });

    it('devuelve 404 a quien no es miembro', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Editar ajeno');

      // Act
      const res = await patch(outsider.token, project.id, { name: 'Nope' });

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });

    it('con id de otro recurso devuelve 404', async () => {
      // Arrange
      const projectId = 'task-1';

      // Act
      const res = await patch(owner.token, projectId, {});

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });

    it('con id inexistente devuelve 404', async () => {
      // Arrange
      const projectId = 'proj-99999';

      // Act
      const res = await patch(owner.token, projectId, {});

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });
  });

  describe('DELETE /projects/:id', () => {
    const del = (token: string, projectId: string) =>
      request(app).delete(`/api/projects/${projectId}`).set(auth(token));

    it('devuelve 403 a un miembro que no es dueño', async () => {
      // Arrange
      const project = await projectWithMember('Borrar como miembro');

      // Act
      const res = await del(member.token, project.id);

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual(apiError('FORBIDDEN', 'Only the project owner can delete it'));
    });

    it('devuelve 404 a quien no es miembro', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Borrar ajeno');

      // Act
      const res = await del(outsider.token, project.id);

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });

    it('devuelve 204 sin cuerpo al dueño', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Borrar propio');

      // Act
      const res = await del(owner.token, project.id);

      // Assert
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });

    it('devuelve 404 si el proyecto ya fue borrado', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Borrar dos veces');
      await del(owner.token, project.id);

      // Act
      const res = await del(owner.token, project.id);

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });
  });

  describe('POST /projects/:id/members', () => {
    const post = (token: string, projectId: string, body: object) =>
      request(app).post(`/api/projects/${projectId}/members`).set(auth(token)).send(body);

    it('agrega un miembro normalizando el email', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Agregar miembro');

      // Act
      const res = await post(owner.token, project.id, { email: '  CHAR-MEMBER@test.com ' });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        projectId: project.id,
        userId: member.id,
        email: 'char-member@test.com',
        role: 'MEMBER',
      });
    });

    it('devuelve 403 a un miembro que no es dueño', async () => {
      // Arrange
      const project = await projectWithMember('Miembros como miembro');

      // Act
      const res = await post(member.token, project.id, { email: 'char-outsider@test.com' });

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual(
        apiError('FORBIDDEN', 'Only the project owner can manage members'),
      );
    });

    it('devuelve 403 a quien no es miembro', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Miembros como ajeno');

      // Act
      const res = await post(outsider.token, project.id, { email: 'char-outsider@test.com' });

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual(
        apiError('FORBIDDEN', 'Only the project owner can manage members'),
      );
    });

    it('con email inválido devuelve 400', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Miembros email inválido');

      // Act
      const res = await post(owner.token, project.id, { email: 'no-es-email' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual(apiError('VALIDATION_ERROR', 'email must be a valid address'));
    });

    it('con email de un usuario inexistente devuelve 404', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Miembros sin usuario');

      // Act
      const res = await post(owner.token, project.id, { email: 'nadie@test.com' });

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'No user found with that email'));
    });

    it('con un usuario que ya es miembro devuelve 409', async () => {
      // Arrange
      const project = await projectWithMember('Miembros repetidos');

      // Act
      const res = await post(owner.token, project.id, { email: 'char-member@test.com' });

      // Assert
      expect(res.status).toBe(409);
      expect(res.body).toEqual(apiError('CONFLICT', 'User is already a member of this project'));
    });

    it('sobre un proyecto inexistente devuelve 404', async () => {
      // Arrange
      const projectId = 'proj-99999';

      // Act
      const res = await post(owner.token, projectId, { email: 'char-member@test.com' });

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });
  });

  describe('DELETE /projects/:id/members/:userId', () => {
    const del = (token: string, projectId: string, userId: string) =>
      request(app).delete(`/api/projects/${projectId}/members/${userId}`).set(auth(token));

    it('devuelve 403 a un miembro que no es dueño', async () => {
      // Arrange
      const project = await projectWithMember('Quitar como miembro');

      // Act
      const res = await del(member.token, project.id, member.id);

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual(
        apiError('FORBIDDEN', 'Only the project owner can manage members'),
      );
    });

    it('no permite quitar al dueño', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Quitar al dueño');

      // Act
      const res = await del(owner.token, project.id, owner.id);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        apiError('VALIDATION_ERROR', 'The project owner cannot be removed from the project'),
      );
    });

    it('devuelve 404 si el usuario no es miembro', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Quitar no miembro');

      // Act
      const res = await del(owner.token, project.id, outsider.id);

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'User is not a member of this project'));
    });

    it('con userId de otro recurso devuelve 404', async () => {
      // Arrange
      const project = await createProject(owner.token, 'Quitar id inválido');

      // Act
      const res = await del(owner.token, project.id, 'proj-1');

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
    });

    it('devuelve 204 sin cuerpo al quitar un miembro', async () => {
      // Arrange
      const project = await projectWithMember('Quitar miembro');

      // Act
      const res = await del(owner.token, project.id, member.id);

      // Assert
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });
  });
});

describe('Caracterización: comentarios', () => {
  let author: User;
  let other: User;
  let outsider: User;
  let projectId: string;

  beforeAll(async () => {
    author = await registerUser('char-author@test.com');
    other = await registerUser('char-other@test.com');
    outsider = await registerUser('char-com-outsider@test.com');
    projectId = (await createProject(author.token, 'Proyecto comentarios char')).id;
    await addMember(author.token, projectId, 'char-other@test.com');
  });

  const newTask = async (title: string) => (await createTask(author.token, projectId, { title })).id;

  const comment = (token: string, taskId: string, body: string) =>
    request(app).post(`/api/tasks/${taskId}/comments`).set(auth(token)).send({ body });

  it('POST /tasks/:id/comments devuelve 201 con el comentario', async () => {
    // Arrange
    const taskId = await newTask('Tarea para comentar');

    // Act
    const res = await comment(author.token, taskId, '  Hola  ');

    // Assert
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
    // Arrange
    const taskId = await newTask('Tarea con comentario vacío');

    // Act
    const res = await comment(author.token, taskId, '   ');

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      apiError('VALIDATION_ERROR', 'Comment body must be between 1 and 1000 characters'),
    );
  });

  it('GET /tasks/:id/comments lista del más nuevo al más viejo', async () => {
    // Arrange
    const taskId = await newTask('Tarea con dos comentarios');
    const first = await comment(author.token, taskId, 'Primero');
    const last = await comment(other.token, taskId, 'Último');

    // Act
    const res = await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(author.token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([last.body, first.body]);
  });

  it('GET /tasks/:id/comments devuelve 403 a no miembros', async () => {
    // Arrange
    const taskId = await newTask('Tarea no listable');

    // Act
    const res = await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(outsider.token));

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });

  it('POST /tasks/:id/comments devuelve 403 a no miembros', async () => {
    // Arrange
    const taskId = await newTask('Tarea no comentable');

    // Act
    const res = await comment(outsider.token, taskId, 'x');

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });

  it('GET /tasks/:id/comments devuelve 404 para tareas inexistentes', async () => {
    // Arrange
    const taskId = 'task-99999';

    // Act
    const res = await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(author.token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  describe('DELETE /comments/:id', () => {
    const del = (token: string, commentId: string) =>
      request(app).delete(`/api/comments/${commentId}`).set(auth(token));

    it('devuelve 404 si el comentario no existe', async () => {
      // Arrange
      const commentId = 'comment-99999';

      // Act
      const res = await del(author.token, commentId);

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Comment not found'));
    });

    it('con id de otro recurso devuelve 404', async () => {
      // Arrange
      const commentId = 'task-1';

      // Act
      const res = await del(author.token, commentId);

      // Assert
      expect(res.status).toBe(404);
      expect(res.body).toEqual(apiError('NOT_FOUND', 'Comment not found'));
    });

    it('devuelve 403 a quien no es el autor', async () => {
      // Arrange
      const taskId = await newTask('Tarea con comentario ajeno');
      const created = await comment(author.token, taskId, 'No lo borres');

      // Act
      const res = await del(other.token, created.body.id);

      // Assert
      expect(res.status).toBe(403);
      expect(res.body).toEqual(apiError('FORBIDDEN', 'You can only delete your own comments'));
    });

    it('devuelve 204 sin cuerpo al autor', async () => {
      // Arrange
      const taskId = await newTask('Tarea con comentario borrable');
      const created = await comment(author.token, taskId, 'Para borrar');

      // Act
      const res = await del(author.token, created.body.id);

      // Assert
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });

    it('sin token devuelve 401', async () => {
      // Arrange
      const url = '/api/comments/comment-1';

      // Act
      const res = await request(app).delete(url);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
    });
  });
});

describe('Caracterización: tareas (partes que se mueven al repositorio)', () => {
  let owner: User;
  let seq = 0;

  beforeAll(async () => {
    owner = await registerUser('char-tasks@test.com');
  });

  const newProject = async () =>
    (await createProject(owner.token, `Proyecto tareas char ${(seq += 1)}`)).id as string;

  it('GET /projects/:id/tasks incluye assignee y commentCount', async () => {
    // Arrange
    const projectId = await newProject();
    const assigned = await createTask(owner.token, projectId, {
      title: 'Con asignado',
      assigneeId: owner.id,
    });
    const unassigned = await createTask(owner.token, projectId, { title: 'Sin asignado' });
    await request(app)
      .post(`/api/tasks/${assigned.id}/comments`)
      .set(auth(owner.token))
      .send({ body: 'c' });

    // Act
    const res = await request(app).get(`/api/projects/${projectId}/tasks`).set(auth(owner.token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        { ...assigned, assignee: { id: owner.id, email: 'char-tasks@test.com' }, commentCount: 1 },
        { ...unassigned, assignee: null, commentCount: 0 },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    });
  });

  it('GET /tasks/:id incluye tags', async () => {
    // Arrange
    const projectId = await newProject();
    const task = await createTask(owner.token, projectId, { title: 'Con tags' });
    const tag = await request(app)
      .post(`/api/tasks/${task.id}/tags`)
      .set(auth(owner.token))
      .send({ name: 'ui' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}`).set(auth(owner.token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, tags: [tag.body] });
  });

  it('GET /tasks/:id/history lista los cambios de estado', async () => {
    // Arrange
    const projectId = await newProject();
    const task = await createTask(owner.token, projectId, {
      title: 'Con historial',
      assigneeId: owner.id,
    });
    await setStatus(owner.token, task.id, 'IN_PROGRESS');

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}/history`).set(auth(owner.token));

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
        changedBy: owner.id,
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        changedAt: ISO,
      },
    ]);
  });

  it('GET /tasks/:id devuelve 404 si la tarea no existe', async () => {
    // Arrange
    const taskId = 'task-99999';

    // Act
    const res = await request(app).get(`/api/tasks/${taskId}`).set(auth(owner.token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  it('DELETE /tasks/:id devuelve 204 sin cuerpo', async () => {
    // Arrange
    const projectId = await newProject();
    const task = await createTask(owner.token, projectId, { title: 'Borrable' });

    // Act
    const res = await request(app).delete(`/api/tasks/${task.id}`).set(auth(owner.token));

    // Assert
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  it('DELETE /tasks/:id devuelve 404 si la tarea ya fue borrada', async () => {
    // Arrange
    const projectId = await newProject();
    const task = await createTask(owner.token, projectId, { title: 'Borrada dos veces' });
    await request(app).delete(`/api/tasks/${task.id}`).set(auth(owner.token));

    // Act
    const res = await request(app).delete(`/api/tasks/${task.id}`).set(auth(owner.token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });
});

describe('Caracterización: auth', () => {
  const email = 'char-auth@test.com';
  let user: User;

  beforeAll(async () => {
    user = await registerUser(email);
  });

  const post = (path: string, body: object) => request(app).post(`/api/auth/${path}`).send(body);

  it('register devuelve 201 con el usuario y el token', async () => {
    // Arrange
    const body = { email: 'char-auth-new@test.com', password: 'Password1' };

    // Act
    const res = await post('register', body);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: expect.stringMatching(/^user-\d+$/),
        email: 'char-auth-new@test.com',
        name: null,
        createdAt: ISO,
      },
      token: expect.any(String),
    });
  });

  it('register con un email ya registrado devuelve 409', async () => {
    // Arrange
    const body = { email, password: 'Password1' };

    // Act
    const res = await post('register', body);

    // Assert
    expect(res.status).toBe(409);
    expect(res.body).toEqual(apiError('CONFLICT', 'Email already registered'));
  });

  it('login con credenciales válidas devuelve 200 con el usuario y el token', async () => {
    // Arrange
    const body = { email, password: 'Password1' };

    // Act
    const res = await post('login', body);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { id: user.id, email, name: null, createdAt: ISO },
      token: expect.any(String),
    });
  });

  it('login con contraseña incorrecta devuelve 401', async () => {
    // Arrange
    const body = { email, password: 'nope' };

    // Act
    const res = await post('login', body);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Invalid credentials'));
  });

  it('forgot-password devuelve 200 con el token de reseteo', async () => {
    // Arrange
    const body = { email };

    // Act
    const res = await post('forgot-password', body);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Password reset requested', token: expect.any(String) });
  });

  it('reset-password con un token válido devuelve 200', async () => {
    // Arrange
    const resetEmail = 'char-auth-reset@test.com';
    await registerUser(resetEmail);
    const forgot = await post('forgot-password', { email: resetEmail });

    // Act
    const res = await post('reset-password', { token: forgot.body.token, newPassword: 'Newpass12' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Password updated' });
  });

  it('reset-password con un token desconocido devuelve 400', async () => {
    // Arrange
    const body = { token: 'x', newPassword: 'Newpass12' };

    // Act
    const res = await post('reset-password', body);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual(apiError('VALIDATION_ERROR', 'Invalid or expired reset token'));
  });
});
