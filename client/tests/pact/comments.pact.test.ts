import { MatchersV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { api } from '../../src/lib/api';
import type { Comment } from '../../src/types';
import { apuntarFetchA, bearer, createProvider, isoDateTime, jsonContentType, publicId } from './helpers';
import { BASE, WITH_COMMENTS } from './states';

const { like, eachLike } = MatchersV3;

const provider = createProvider();

const commentFields = {
  id: publicId('comment', 'comment-1'),
  taskId: publicId('task', 'task-1'),
  authorId: publicId('user', 'user-1'),
  createdAt: isoDateTime(),
};

describe('contrato de comentarios', () => {
  it('lista los comentarios de una tarea', async () => {
    await provider
      .addInteraction()
      .given(WITH_COMMENTS)
      .uponReceiving('un pedido de los comentarios de una tarea')
      .withRequest('GET', '/api/tasks/task-1/comments', (b) => b.headers({ Authorization: bearer() }))
      .willRespondWith(200, (b) =>
        b.jsonBody(eachLike({ ...commentFields, body: like('Revisado y aprobado') })),
      )
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const comments = await api<Comment[]>('/tasks/task-1/comments');
        expect(comments[0].body).toBe('Revisado y aprobado');
      });
  });

  it('agrega un comentario a una tarea', async () => {
    await provider
      .addInteraction()
      .given(BASE)
      .uponReceiving('un pedido para comentar una tarea')
      .withRequest('POST', '/api/tasks/task-1/comments', (b) =>
        b
          .headers({ Authorization: bearer(), 'Content-Type': jsonContentType() })
          .jsonBody({ body: 'Lo reviso mañana' }),
      )
      .willRespondWith(201, (b) => b.jsonBody({ ...commentFields, body: 'Lo reviso mañana' }))
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const comment = await api<Comment>('/tasks/task-1/comments', {
          method: 'POST',
          body: { body: 'Lo reviso mañana' },
        });
        expect(comment.body).toBe('Lo reviso mañana');
      });
  });
});
