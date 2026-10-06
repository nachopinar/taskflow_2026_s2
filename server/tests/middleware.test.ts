import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { addMember, apiError, app, auth, createProject, createTask, registerUser } from './helpers';
import { authenticate } from '../src/middleware/auth';
import { errorHandler, notFoundHandler } from '../src/middleware/errors';
import { requireProjectMember, requireTaskProjectMember } from '../src/middleware/membership';

// App mínima para ejercitar un middleware aislado y ver lo que recibe el cliente.
function miniApp(mount: (mini: express.Express) => void) {
  const mini = express();
  mount(mini);
  mini.use(notFoundHandler);
  mini.use(errorHandler);
  return mini;
}

describe('Middleware: authenticate', () => {
  it('sin header Authorization devuelve 401', async () => {
    // Arrange
    const url = '/api/projects';

    // Act
    const res = await request(app).get(url);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
  });

  it('con un esquema distinto de Bearer devuelve 401', async () => {
    // Arrange
    const { token } = await registerUser('mw-scheme@test.com');

    // Act
    const res = await request(app).get('/api/projects').set({ Authorization: `Basic ${token}` });

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
  });

  it('con un token malformado devuelve 401', async () => {
    // Arrange
    const token = 'no-es-un-jwt';

    // Act
    const res = await request(app).get('/api/projects').set(auth(token));

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Invalid or expired token'));
  });

  it('con un token firmado con otro secreto devuelve 401', async () => {
    // Arrange
    const token = jwt.sign({ userId: 1, email: 'mw-forged@test.com' }, 'otro-secreto');

    // Act
    const res = await request(app).get('/api/projects').set(auth(token));

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Invalid or expired token'));
  });

  it('con un token vencido devuelve 401', async () => {
    // Arrange
    const token = jwt.sign({ userId: 1, email: 'mw-expired@test.com' }, 'test-secret', {
      expiresIn: -10,
    });

    // Act
    const res = await request(app).get('/api/projects').set(auth(token));

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Invalid or expired token'));
  });

  it('con un token válido deja en req.user al usuario autenticado', async () => {
    // Arrange
    const user = await registerUser('mw-valid@test.com');
    const mini = miniApp((m) => {
      m.get('/whoami', authenticate, (req, res) => {
        res.json(req.user);
      });
    });

    // Act
    const res = await request(mini).get('/whoami').set(auth(user.token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: Number(user.id.replace('user-', '')),
      email: 'mw-valid@test.com',
    });
  });
});

describe('Middleware: requireProjectMember', () => {
  it('deja pasar a un miembro del proyecto', async () => {
    // Arrange
    const owner = await registerUser('mw-pm-owner1@test.com');
    const member = await registerUser('mw-pm-member1@test.com');
    const project = await createProject(owner.token, 'MW proyecto miembro');
    await addMember(owner.token, project.id, 'mw-pm-member1@test.com');

    // Act
    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(member.token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('rechaza con 403 a quien no es miembro', async () => {
    // Arrange
    const owner = await registerUser('mw-pm-owner2@test.com');
    const outsider = await registerUser('mw-pm-outsider2@test.com');
    const project = await createProject(owner.token, 'MW proyecto ajeno');

    // Act
    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks`)
      .set(auth(outsider.token));

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });

  it('rechaza con 403 a quien dejó de ser miembro', async () => {
    // Arrange
    const owner = await registerUser('mw-pm-owner3@test.com');
    const member = await registerUser('mw-pm-member3@test.com');
    const project = await createProject(owner.token, 'MW proyecto ex miembro');
    await addMember(owner.token, project.id, 'mw-pm-member3@test.com');
    await request(app)
      .delete(`/api/projects/${project.id}/members/${member.id}`)
      .set(auth(owner.token));

    // Act
    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(member.token));

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });

  it('devuelve 404 si el proyecto no existe', async () => {
    // Arrange
    const { token } = await registerUser('mw-pm-missing@test.com');

    // Act
    const res = await request(app).get('/api/projects/proj-999999/tasks').set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Project not found'));
  });

  it('devuelve 401 si la ruta se montó sin authenticate', async () => {
    // Arrange
    const mini = miniApp((m) => {
      m.get('/projects/:projectId', requireProjectMember(), (_req, res) => {
        res.json({ ok: true });
      });
    });

    // Act
    const res = await request(mini).get('/projects/proj-1');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
  });
});

describe('Middleware: requireTaskProjectMember', () => {
  it('deja pasar a un miembro del proyecto de la tarea', async () => {
    // Arrange
    const owner = await registerUser('mw-tm-owner1@test.com');
    const member = await registerUser('mw-tm-member1@test.com');
    const project = await createProject(owner.token, 'MW tarea miembro');
    await addMember(owner.token, project.id, 'mw-tm-member1@test.com');
    const task = await createTask(owner.token, project.id, { title: 'Tarea visible' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}`).set(auth(member.token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...task, tags: [] });
  });

  it('rechaza con 403 a quien no es miembro', async () => {
    // Arrange
    const owner = await registerUser('mw-tm-owner2@test.com');
    const outsider = await registerUser('mw-tm-outsider2@test.com');
    const project = await createProject(owner.token, 'MW tarea ajena');
    const task = await createTask(owner.token, project.id, { title: 'Tarea privada' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}`).set(auth(outsider.token));

    // Assert
    expect(res.status).toBe(403);
    expect(res.body).toEqual(apiError('FORBIDDEN', 'You are not a member of this project'));
  });

  it('devuelve 404 si la tarea no existe', async () => {
    // Arrange
    const { token } = await registerUser('mw-tm-missing@test.com');

    // Act
    const res = await request(app).get('/api/tasks/task-999999').set(auth(token));

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Task not found'));
  });

  it('devuelve 401 si la ruta se montó sin authenticate', async () => {
    // Arrange
    const mini = miniApp((m) => {
      m.get('/tasks/:taskId', requireTaskProjectMember(), (_req, res) => {
        res.json({ ok: true });
      });
    });

    // Act
    const res = await request(mini).get('/tasks/task-1');

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
  });
});

describe('Middleware: manejo de errores', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('una ruta inexistente devuelve 404 en formato JSON', async () => {
    // Arrange
    const url = '/api/no-existe';

    // Act
    const res = await request(app).get(url);

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual(apiError('NOT_FOUND', 'Endpoint not found'));
  });

  it('un error inesperado devuelve 500 sin filtrar el detalle interno', async () => {
    // Arrange
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const mini = miniApp((m) => {
      m.get('/boom', () => {
        throw new Error('detalle interno secreto');
      });
    });

    // Act
    const res = await request(mini).get('/boom');

    // Assert
    expect(res.status).toBe(500);
    expect(res.body).toEqual(apiError('INTERNAL', 'Unexpected server error'));
  });
});
