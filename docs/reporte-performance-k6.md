# Reporte de performance con k6: listado de tareas

- **Fecha:** 2026-11-03
- **Escenario:** `performance/scenarios/api-load.k6.js` (`GET /api/projects/:id/tasks`)
- **Conclusión:** con la seed grande, el listado de tareas no cumple el p95 de 500 ms que pide la especificación: mide 40,84 s.

## Resultados

| Anotá | Seed chica (1 VU, 30 s) | Seed grande (20 VUs, 1 min) |
|---|---:|---:|
| p95 (`http_req_duration`) | 54,13 ms | 40,84 s |
| Error rate (`http_req_failed`) | 0,00 % (0 de 32) | 0,00 % (0 de 42) |
| Iteraciones por segundo | 0,96 | 0,51 |

Los umbrales del script son `p(95)<500` y `rate<0.01`. La corrida grande no cumple el de duración y k6 termina con código 99. No hay errores HTTP: el sistema responde bien, pero tarda demasiado.

## Corridas de control

Las dos corridas de la tabla cambian a la vez los datos y los usuarios virtuales. Estas dos, con la seed grande cargada, separan cada factor:

| Corrida | Proyecto | p95 | Iteraciones por segundo |
|---|---|---:|---:|
| 1 VU, 30 s | `[Carga] Proyecto grande` (5.000 tareas) | 10,24 s | 0,09 |
| 20 VUs, 30 s | `proj-1` de la seed chica (6 tareas) | 163,29 ms | 18,31 |

- Con un solo usuario, el proyecto grande ya supera el límite unas 20 veces.
- Con 20 usuarios y la base igual de cargada, un proyecto chico sigue por debajo de 500 ms.

Lo que crece no es el tamaño total de la base ni la concurrencia por sí sola, sino la cantidad de tareas del proyecto listado.

## Hipótesis

El costo del listado crece de forma lineal con las tareas del proyecto, por dos defectos del código:

1. **Consultas N+1.** `listTasks` (`server/src/modules/tasks/tasks.service.ts:46-62`) recorre todas las filas y, por cada una, consulta el asignado y cuenta los comentarios. Con la seed grande son 8.751 consultas por request: 1 de tareas, 3.750 de asignados y 5.000 conteos. El número sale del código y de los datos cargados; no se midió con un log de consultas.
2. **Sin paginación real.** El controller calcula `limit` y `offset` pero no se los pasa al servicio (`server/src/modules/tasks/tasks.controller.ts:24-29`). `GET .../tasks?limit=20` devuelve las 5.000 tareas (1,86 MB) y responde `limit: 20`.

Con 20 usuarios, estos requests se acumulan y compiten por el mismo proceso y la misma base, por eso el p95 pasa de 10,24 s a 40,84 s. Los índices de `tasks.projectId` y `comments.taskId` ya existen, así que no parece un problema de índices faltantes.

**Para confirmarla:** activar el log de consultas de Prisma, contar las consultas por request y repetir la medición con asignados y conteos resueltos en una sola consulta y paginación aplicada. Este reporte no corrige el código.

## Criterios de rendimiento incumplidos

| Criterio de la especificación | Obtenido |
|---|---|
| RNF Rendimiento 1: "Todo endpoint de listado devuelve resultados paginados; ningún endpoint devuelve una colección completa sin límite." | `limit=20` devuelve 5.000 tareas |
| RNF Rendimiento 2: "Con un volumen de 5.000 tareas y 20.000 comentarios, el tiempo de respuesta del listado de tareas (percentil 95) no supera los 500 ms." | p95 de 40,84 s con 20 VUs y de 10,24 s con 1 VU |
| RNF Rendimiento 3: "El número de consultas a la base de datos por request no depende de la cantidad de resultados devueltos." | Según el código, 1 consulta + 1 por asignado + 1 por tarea |

## Entorno

- Intel Core i7-10510U, 24 GB de RAM, Windows 11 Pro
- Node 24.21.0, k6 2.3.0, SQLite
- API con `npm run dev` (`ts-node-dev --transpile-only`), en la misma máquina que k6
- Rama base: `dev` (`1fdd83f`)

## Cómo reproducirlo

Desde la raíz del repo:

```bash
npm run db:reset      # o npm run db:setup si la base está vacía
npm run dev           # dejar corriendo; lo que sigue, en otra terminal
k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
npm --prefix server run db:seed:large
k6 run -e VUS=20 -e DURATION=1m performance/scenarios/api-load.k6.js

# Controles
k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
k6 run -e VUS=20 -e DURATION=30s -e PROJECT_ID=proj-1 performance/scenarios/api-load.k6.js
```

Esta medición partió de una base recién creada y vacía, así que usó `npm run db:setup`, que deja el mismo estado que `db:reset`: migraciones y seed chica.

La seed grande imprimió:

```text
Seed grande listo: 200 proyectos de carga, 5000 tareas y 20000 comentarios en el proyecto grande.
Proyecto grande -> id: 4, nombre: "[Carga] Proyecto grande"
```

## Evidencia

Seed chica, 1 VU, 30 s:

```text
✓ 'p(95)<500' p(95)=54.13ms
✓ 'rate<0.01' rate=0.00%
http_req_failed................: 0.00%  0 out of 32
iterations.....................: 30     0.957326/s
```

Seed grande, 20 VUs, 1 min:

```text
✗ 'p(95)<500' p(95)=40.84s
✓ 'rate<0.01' rate=0.00%
http_req_failed................: 0.00% 0 out of 42
iterations.....................: 40     0.512779/s
data_received..................: 75 MB 957 kB/s
level=error msg="thresholds on metrics 'http_req_duration' have been crossed"
```

Límite ignorado (`GET /api/projects/proj-4/tasks?limit=20`):

```text
status=200 time=10.669286s size=1864052B
{ items: 5000, total: 5000, limit: 20, offset: 0 }
```
