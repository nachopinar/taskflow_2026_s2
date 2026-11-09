import type { Server } from 'http';
import type { AddressInfo } from 'net';
import path from 'path';
import request from 'supertest';
import { Verifier } from '@pact-foundation/pact';
import { app, auth, createProject, createTask, registerUser } from '../helpers';

const PACT_FILE = path.resolve(__dirname, '../../../pacts/taskflow-web-taskflow-api.json');

let server: Server;
let token = '';
let projectId = '';

beforeAll((done) => {
  server = app.listen(0, done); // la API real, en un puerto libre
});

afterAll((done) => {
  server.close(done);
});

// Idempotente: se crea una sola vez aunque lo pidan varios estados
async function estadoBase(): Promise<undefined> {
  if (token) return undefined;
  const u = await registerUser('ana@test.com');
  token = u.token;
  const p = await createProject(token, 'Rediseño del sitio'); // → proj-1
  projectId = p.id;
  await createTask(token, projectId, { title: 'Implementar login' }); // → task-1
  return undefined;
}

// Tarea nueva para las interacciones que la modifican; su id viaja al pedido con fromProviderState
async function tareaNueva(): Promise<string> {
  await estadoBase();
  const task = await createTask(token, projectId, { title: 'Escribir tests' });
  return task.id;
}

describe('contrato de tareas (proveedor)', () => {
  it('cumple el contrato de taskflow-web', async () => {
    const { port } = server.address() as AddressInfo;

    await new Verifier({
      provider: 'taskflow-api',
      providerBaseUrl: `http://127.0.0.1:${port}`,
      pactUrls: [PACT_FILE],
      logLevel: 'warn',

      stateHandlers: {
        'ana es miembro de proj-1 y el proyecto tiene tareas': estadoBase,
        'la tarea task-1 tiene comentarios': async () => {
          await estadoBase();
          await request(app)
            .post('/api/tasks/task-1/comments')
            .set(auth(token))
            .send({ body: 'Revisado y aprobado' });
          return undefined;
        },
        'ana es miembro de proj-1 y existe una tarea por hacer': async () => ({
          taskId: await tareaNueva(),
        }),
        'existe una tarea con la etiqueta frontend': async () => {
          const taskId = await tareaNueva();
          const tag = await request(app)
            .post(`/api/tasks/${taskId}/tags`)
            .set(auth(token))
            .send({ name: 'frontend' });
          return { taskId, tagId: tag.body.id as string };
        },
      },

      // el token del contrato es de mentira: lo cambiamos por uno válido
      requestFilter: (req, _res, next) => {
        req.headers.authorization = `Bearer ${token}`;
        next();
      },
    }).verifyProvider();
  });
});
