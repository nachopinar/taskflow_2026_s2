import { MatchersV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/lib/api';
import type { HistoryEntry, Task, TaskListResponse } from '../../src/types';
import {
  apuntarFetchA,
  bearer,
  calendarDate,
  createProvider,
  isoDateTime,
  jsonContentType,
  priority,
  publicId,
  status,
} from './helpers';
import { BASE, FRESH_TASK, FRESH_TASK_ID } from './states';

const { like, eachLike, integer, fromProviderState } = MatchersV3;

const provider = createProvider();

const taskFields = {
  id: publicId('task', 'task-1'),
  projectId: publicId('proj', 'proj-1'),
  title: like('Implementar login'),
  status: status('TODO'),
  priority: priority('MEDIUM'),
  createdAt: isoDateTime(),
  updatedAt: isoDateTime(),
};

describe('contrato de tareas', () => {
  it('lista las tareas de un proyecto', async () => {
    await provider
      .addInteraction()
      .given(BASE)
      .uponReceiving('un pedido del listado de tareas')
      .withRequest('GET', '/api/projects/proj-1/tasks', (b) => b.headers({ Authorization: bearer() }))
      .willRespondWith(200, (b) =>
        b.jsonBody({
          items: eachLike({ ...taskFields, commentCount: integer(0) }),
          total: integer(1),
          limit: integer(20),
          offset: integer(0),
        }),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const res = await api<TaskListResponse>('/projects/proj-1/tasks');
        expect(res.items[0].id).toBe('task-1');
        expect(res.total).toBe(1);
      });
  });

  it('crea una tarea', async () => {
    const body = {
      title: 'Diseñar el tablero',
      description: 'Columnas por estado',
      priority: 'HIGH',
      dueDate: '2026-12-15',
    };

    await provider
      .addInteraction()
      .given(BASE)
      .uponReceiving('un pedido para crear una tarea')
      .withRequest('POST', '/api/projects/proj-1/tasks', (b) =>
        b.headers({ Authorization: bearer(), 'Content-Type': jsonContentType() }).jsonBody(body),
      )
      .willRespondWith(201, (b) =>
        b.jsonBody({
          ...taskFields,
          title: like(body.title),
          description: like(body.description),
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: null,
          dueDate: calendarDate(body.dueDate),
        }),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const task = await api<Task>('/projects/proj-1/tasks', { method: 'POST', body });
        expect(task.status).toBe('TODO');
        expect(task.priority).toBe('HIGH');
      });
  });

  it('devuelve el detalle de una tarea con sus etiquetas', async () => {
    await provider
      .addInteraction()
      .given(BASE)
      .uponReceiving('un pedido del detalle de una tarea')
      .withRequest('GET', '/api/tasks/task-1', (b) => b.headers({ Authorization: bearer() }))
      .willRespondWith(200, (b) =>
        b.jsonBody({
          ...taskFields,
          description: null,
          assigneeId: null,
          dueDate: null,
          tags: [],
        }),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const task = await api<Task>('/tasks/task-1');
        expect(task.id).toBe('task-1');
        expect(task.tags).toEqual([]);
      });
  });

  it('responde 404 con el formato de error cuando la tarea no existe', async () => {
    await provider
      .addInteraction()
      .given(BASE)
      .uponReceiving('un pedido del detalle de una tarea que no existe')
      .withRequest('GET', '/api/tasks/task-999', (b) => b.headers({ Authorization: bearer() }))
      .willRespondWith(404, (b) =>
        b.jsonBody({
          error: { code: 'NOT_FOUND', message: like('Task not found'), details: [] },
        }),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const err = await api('/tasks/task-999').catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(404);
        expect((err as ApiError).code).toBe('NOT_FOUND');
      });
  });

  it('cambia el estado de una tarea', async () => {
    await provider
      .addInteraction()
      .given(FRESH_TASK)
      .uponReceiving('un pedido para mover una tarea a en progreso')
      .withRequest(
        'PATCH',
        fromProviderState('/api/tasks/${taskId}', `/api/tasks/${FRESH_TASK_ID}`),
        (b) =>
          b
            .headers({ Authorization: bearer(), 'Content-Type': jsonContentType() })
            .jsonBody({ status: 'IN_PROGRESS' }),
      )
      .willRespondWith(200, (b) =>
        b.jsonBody({
          ...taskFields,
          id: publicId('task', FRESH_TASK_ID),
          status: 'IN_PROGRESS',
        }),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const task = await api<Task>(`/tasks/${FRESH_TASK_ID}`, {
          method: 'PATCH',
          body: { status: 'IN_PROGRESS' },
        });
        expect(task.status).toBe('IN_PROGRESS');
      });
  });

  it('edita los campos de una tarea', async () => {
    // Mismo formato que arma toUpdateBody: los opcionales vacíos van como null
    const body = {
      title: 'Escribir tests de contrato',
      description: null,
      priority: 'CRITICAL',
      assigneeId: null,
      dueDate: '2026-11-30',
    };

    await provider
      .addInteraction()
      .given(FRESH_TASK)
      .uponReceiving('un pedido para editar una tarea')
      .withRequest(
        'PATCH',
        fromProviderState('/api/tasks/${taskId}', `/api/tasks/${FRESH_TASK_ID}`),
        (b) =>
          b.headers({ Authorization: bearer(), 'Content-Type': jsonContentType() }).jsonBody(body),
      )
      .willRespondWith(200, (b) =>
        b.jsonBody({
          ...taskFields,
          id: publicId('task', FRESH_TASK_ID),
          title: like(body.title),
          description: null,
          priority: 'CRITICAL',
          assigneeId: null,
          dueDate: calendarDate(body.dueDate),
        }),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const task = await api<Task>(`/tasks/${FRESH_TASK_ID}`, { method: 'PATCH', body });
        expect(task.title).toBe(body.title);
        expect(task.priority).toBe('CRITICAL');
      });
  });

  it('elimina una tarea', async () => {
    await provider
      .addInteraction()
      .given(FRESH_TASK)
      .uponReceiving('un pedido para eliminar una tarea')
      .withRequest(
        'DELETE',
        fromProviderState('/api/tasks/${taskId}', `/api/tasks/${FRESH_TASK_ID}`),
        (b) => b.headers({ Authorization: bearer() }),
      )
      .willRespondWith(204)
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const res = await api(`/tasks/${FRESH_TASK_ID}`, { method: 'DELETE' });
        expect(res).toBeUndefined();
      });
  });

  it('devuelve el historial de estados de una tarea', async () => {
    await provider
      .addInteraction()
      .given(BASE)
      .uponReceiving('un pedido del historial de una tarea')
      .withRequest('GET', '/api/tasks/task-1/history', (b) => b.headers({ Authorization: bearer() }))
      .willRespondWith(200, (b) =>
        b.jsonBody(
          eachLike({
            id: integer(1),
            taskId: publicId('task', 'task-1'),
            changedBy: publicId('user', 'user-1'),
            fromStatus: null,
            toStatus: status('TODO'),
            changedAt: isoDateTime(),
          }),
        ),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const entries = await api<HistoryEntry[]>('/tasks/task-1/history');
        expect(entries[0].fromStatus).toBeNull();
        expect(entries[0].toStatus).toBe('TODO');
      });
  });
});
