import { MatchersV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { api } from '../../src/lib/api';
import type { Tag } from '../../src/types';
import { apuntarFetchA, bearer, createProvider, jsonContentType, publicId } from './helpers';
import { FRESH_TASK, FRESH_TASK_ID, TAG_ID, TASK_WITH_TAG } from './states';

const { fromProviderState } = MatchersV3;

const provider = createProvider();

describe('contrato de etiquetas', () => {
  it('agrega una etiqueta a una tarea', async () => {
    await provider
      .addInteraction()
      .given(FRESH_TASK)
      .uponReceiving('un pedido para agregar una etiqueta')
      .withRequest(
        'POST',
        fromProviderState('/api/tasks/${taskId}/tags', `/api/tasks/${FRESH_TASK_ID}/tags`),
        (b) =>
          b
            .headers({ Authorization: bearer(), 'Content-Type': jsonContentType() })
            .jsonBody({ name: 'frontend' }),
      )
      .willRespondWith(201, (b) => b.jsonBody({ id: publicId('tag', TAG_ID), name: 'frontend' }))
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const tag = await api<Tag>(`/tasks/${FRESH_TASK_ID}/tags`, {
          method: 'POST',
          body: { name: 'frontend' },
        });
        expect(tag.name).toBe('frontend');
      });
  });

  it('quita una etiqueta de una tarea', async () => {
    await provider
      .addInteraction()
      .given(TASK_WITH_TAG)
      .uponReceiving('un pedido para quitar una etiqueta')
      .withRequest(
        'DELETE',
        fromProviderState(
          '/api/tasks/${taskId}/tags/${tagId}',
          `/api/tasks/${FRESH_TASK_ID}/tags/${TAG_ID}`,
        ),
        (b) => b.headers({ Authorization: bearer() }),
      )
      .willRespondWith(204)
      .executeTest(async (mock) => {
        apuntarFetchA(mock.url);
        const res = await api(`/tasks/${FRESH_TASK_ID}/tags/${TAG_ID}`, { method: 'DELETE' });
        expect(res).toBeUndefined();
      });
  });
});
