# Code smells detectados y refactors aplicados

- **Fecha del refactor:** 2026-09-15
- **PRs:** #1 (`fix-server-module`), #2 (`fix/god-component`), #3 (`fix-updatetask-nesting`) y #4 (`fix-errors-and-routes`), integrados a `main` con el PR #5.
- **Red de seguridad:** antes de tocar el código se fijó el comportamiento actual con tests de caracterización (`server/tests/characterization.test.ts`, commit `97d545f`). Cubren status y cuerpo de los endpoints de proyectos y comentarios, y los de tareas y auth afectados por la reestructuración. Los bugs conocidos quedaron registrados como comportamiento actual y ningún refactor los corrigió.

Los nombres de los smells siguen el catálogo de Fowler (_Refactoring_, 2.ª ed.).

| # | Smell | Dónde estaba | Refactor que lo resolvió | Commit |
|---|-------|--------------|--------------------------|--------|
| 1 | **Divergent Change** (controladores con todas las responsabilidades) | `projects.controller.ts` (192 líneas): leía `req`, validaba, aplicaba reglas de ownership, consultaba `db` y serializaba. `tasks.controller.ts` y `tasks.service.ts` también llamaban a `db` directo. La lógica de comentarios y auth estaba en los archivos de rutas. | Separar cada módulo en **routes → controller → service → repository**. Se crearon `projects.service.ts`, `projects.repository.ts`, `tasks.repository.ts`, `comments.controller.ts`, `auth.controller.ts` y `auth.repository.ts`. Ahora solo los `*.repository.ts` y `middleware/membership.ts` importan `lib/db`. | `dbb5acd` |
| 2 | **Primitive Obsession** (strings mágicos) | Roles `'OWNER'` / `'MEMBER'` como literales en `projects.service.ts`, `tasks.service.ts`, `client/src/lib/members.ts` y `MembersPage.tsx`. En `client/src/types.ts`, `status`, `priority` y `role` eran `string`, y `BoardPage.tsx` usaba casts como `task.status as (typeof STATUSES)[number]`. | Constantes y tipos tipados: `ROLES`/`Role`/`OWNER`/`ADMIN`/`MEMBER` junto a `STATUSES` y `PRIORITIES` en el server (`lib/validation.ts`), `toStatus()` para estrechar el estado leído de la base, y `Status`, `Priority`, `Role`, `isStatus` e `isPriority` en el client. | `1d265e4` |
| 3 | **Duplicated Code** (mensajes de error de la API) | `err instanceof ApiError ? err.message : '…'` repetido 18 veces en `TaskDetailPage.tsx` (9), `BoardPage.tsx` (3), `MembersPage.tsx` (2), `ProjectsPage.tsx` (2), `LoginPage.tsx` y `lib/project.ts`. | **Extract Function**: helper `errorText(err, fallback)` en `client/src/lib/api.ts`. | `6a507cb` |
| 4 | **Duplicated Code** (estado de acciones asíncronas) | `LoginPage.tsx`, `MembersPage.tsx` y `ProjectsPage.tsx` repetían el mismo armado: `useState` de error y de `submitting`, más `try / catch / finally` en cada acción. | **Extract Function**: hook `useAsyncAction` en `client/src/lib/asyncAction.ts`. | `ee266ed` |
| 5 | **Duplicated Code** (formulario de tarea) | `BoardPage.tsx` (alta) y `TaskDetailPage.tsx` (edición) tenían cada uno su propia copia de los campos título, descripción, prioridad, asignado y vencimiento, con sus `<select>` de prioridad, estado y miembro y el armado del body del request. | Extraer `TaskFields`, `PrioritySelect`, `StatusSelect` y `MemberSelect` a `client/src/components/task/`, y los bodies a `client/src/lib/taskBody.ts` (`toCreateBody`, `toUpdateBody`). | `0702544` |
| 6 | **Large Class** (god component) | `TaskDetailPage.tsx` (405 líneas en el fork): manejaba carga, edición, cambio de estado, etiquetas, comentarios e historial, cada uno con su propio estado de error. | **Extract Class**: componentes `TaskEditForm`, `TaskStatusForm`, `TaskTags`, `TaskComments` y `TaskHistory`, y hooks `useTask`, `useTaskComments` y `useTaskHistory` (`client/src/lib/task.ts`). La página quedó en 68 líneas y solo carga datos y arma las secciones. | `9f7ffd1` |
| 7 | **Long Function** con condicionales anidados | `updateTask` en `server/src/modules/tasks/tasks.service.ts`: `if/else` de hasta cuatro niveles para validar el asignado y el permiso de cambio de estado. La resolución del asignado estaba además duplicada con `createTask`. | **Replace Nested Conditional with Guard Clauses** y **Extract Function**: `resolveAssigneeId`, `resolveStatusChange` e `isProjectAdmin`, compartidas por `createTask` y `updateTask`. Se agregó `server/tests/task-update.test.ts` para cubrir las ramas. | `e7336f9` |
| 8 | **Duplicated Code** (manejo de errores async) | Cada handler tenía su propio `try { … } catch (err) { next(err); }`: 20 bloques entre `tasks.controller.ts` (8), `projects.controller.ts` (6), `comments.controller.ts` (3), `membership.ts` (2) y `auth.controller.ts` (1). | **Extract Function**: wrapper `asyncHandler` en `server/src/lib/http.ts`, que reenvía los rechazos al middleware de errores. Se agregó `server/tests/errors.test.ts`. | `e59ab3e` |
| 9 | **Duplicated Code** (parseo de ids de ruta) | `parsePublicId(req.params.x, …)` seguido de `if (id === null) throw notFound(…)` repetido en cada handler de tareas, proyectos y comentarios, y en `requireProjectMember` / `requireTaskProjectMember`. | Parsear cada id una sola vez con `router.param` (`server/src/lib/params.ts`: `idParam`, `projectIdOf`, `taskIdOf`, `commentIdOf`). Se agregó `server/tests/route-ids.test.ts`. | `09364db` |

## Lo que no se tocó a propósito

Por ser bugs o duplicaciones que forman parte del trabajo del curso, estos quedaron como estaban (ver el mensaje del commit `dbb5acd`):

- El 404 o 403 inconsistente en proyectos.
- La falta de largo mínimo del nombre al crear un proyecto.
- La falta de guard de membresía en `PATCH` / `DELETE /api/tasks/:taskId`.
- Las consultas N+1 al listar tareas.
- `EMAIL_CHECK` en `projects.service.ts`, que duplica `EMAIL_RE`.
