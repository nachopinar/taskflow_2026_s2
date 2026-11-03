# Reporte de performance con k6

Listado de tareas (`GET /api/projects/:id/tasks`), medido el 2026-11-03. Hallazgo cargado en el issue #14.

| Anotá | Seed chica (1 VU, 30 s) | Seed grande (20 VUs, 1 min) |
|---|---:|---:|
| p95 (`http_req_duration`) | 54,13 ms | 40,84 s |
| Error rate (`http_req_failed`) | 0,00 % | 0,00 % |
| Iteraciones por segundo | 0,96 | 0,51 |

## Hipótesis

Lo que crece con los datos es la cantidad de tareas del proyecto listado. `listTasks` consulta el asignado y cuenta los comentarios de cada tarea (N+1), y el listado ignora `limit`, así que procesa las 5.000 tareas en cada request.

**Nota:** la seed chica se cargó con `npm run db:setup` sobre una base vacía, que deja el mismo estado que `npm run db:reset`.
