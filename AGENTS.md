# AGENTS.md

Guía para agentes de código (Claude Code, Codex, Cursor, Copilot, etc.) que trabajen en TaskFlow. Las reglas aplican a cualquier agente y a cualquier persona del equipo que lo use.

## Contexto del proyecto

TaskFlow es el proyecto del curso **Testing y Calidad de Software**. Es un gestor de tareas colaborativo: API en Express + Prisma + SQLite (`server/`) y frontend en React 18 + Vite (`client/`).

**El sistema tiene bugs a propósito.** Encontrarlos y documentarlos con tests es parte del trabajo. De eso se desprenden las dos reglas principales:

1. **No arregles bugs existentes salvo que te lo pidan explícitamente.** Si encontrás uno, reportalo (en tu respuesta, en un test que falla, o en `docs/`), pero no toques el código de producción para corregirlo.
2. **El código nuevo tiene que ser de buena calidad y no introducir errores nuevos.** Que el repo tenga defectos no habilita a escribir código descuidado ni a copiar un patrón defectuoso.

### Fuente de verdad

- La especificación (`taskflow_especificacion_requerimientos.docx`, 17 historias de usuario con criterios de aceptación) **manda sobre el comportamiento actual**. Si el código y la spec no coinciden, la spec tiene razón.
- Las decisiones de arquitectura están en `docs/` como ADRs (`docs/NNNN-titulo.md`). Leé los ADRs relevantes antes de cambiar algo que cubran. Si una tarea contradice un ADR, frená y avisá en lugar de ignorarlo.
- `docs/reporte-tests-fallidos.md` lista los tests que fallan a propósito porque la API no cumple la spec.

## Comandos

Desde la raíz:

| Comando | Qué hace |
|---|---|
| `npm install` | Instala raíz, `server/` y `client/` |
| `npm run db:setup` | Migraciones + datos de ejemplo (requiere `server/.env`, copiado de `server/.env.example`) |
| `npm run dev` | API en `:3000/api` y frontend en `:5173` |
| `npm test` | Suite de API (Jest, en serie) |
| `npm run test:coverage` | Suite con cobertura y umbrales (70% líneas, 60% ramas) |
| `npm run build` / `npm run build:client` | Compila server / client con `tsc` |

Para verificar tipos sin compilar: `npx --prefix server tsc -p server/tsconfig.json --noEmit` y `npx --prefix client tsc -p client/tsconfig.json --noEmit`.

`npm run lint` hoy no funciona: ESLint no está en las dependencias ni configurado. No lo arregles por tu cuenta; usá el chequeo de tipos.

## Antes de dar una tarea por terminada

- [ ] Compila sin errores de tipos en los paquetes que tocaste.
- [ ] `npm test` no tiene **fallos nuevos**. Los fallos conocidos (los de `auth-findings.test.ts` listados en `docs/reporte-tests-fallidos.md`) se mantienen; cualquier otro fallo lo introdujiste vos.
- [ ] Si tocaste `server/src/`, `npm run test:coverage` sigue pasando los umbrales.
- [ ] No redefiniste tipos, constantes ni helpers que ya existían, y lo nuevo reutilizable quedó en su archivo compartido.
- [ ] El diff tiene solo lo que pedía la tarea: nada de refactors, renombres ni formateo de código ajeno.
- [ ] Si encontraste comportamiento raro o un bug, lo dijiste en tu respuesta.

## Buenas prácticas de código

### Generales

- **TypeScript estricto.** Nada de `any`, `@ts-ignore` ni `as` innecesarios. Si un tipo no cierra, arreglá el tipo.
- **Cambios chicos y enfocados.** Una tarea, un cambio. No mezcles feature, refactor y tests en el mismo commit.
- **Seguí el estilo del archivo que tocás** (comillas simples, punto y coma, 2 espacios, imports relativos). No reformatees lo que no cambiaste.
- **Nombres claros, funciones cortas, guard clauses** antes que `if` anidados.
- **Constantes con nombre** en lugar de números o strings mágicos. Ya existen constantes tipadas para estados, prioridades y roles (`server/src/lib/validation.ts`, `client/src/types.ts`): usalas.
- **Reutilizá tipos y helpers existentes.** Es obligatorio; ver [Tipos y helpers compartidos](#tipos-y-helpers-compartidos).
- **Comentarios solo cuando explican un porqué** que no se lee en el código.
- **No agregues dependencias** sin que te lo pidan. Si una hace falta, fijá la versión exacta (el repo no usa `^` ni `~`).
- **Nunca** commitees `.env`, archivos `.db`, `coverage/` ni secretos.

### Tipos y helpers compartidos

**Antes de escribir un tipo, una constante o una función, buscá si ya existe** (`grep` en las carpetas de abajo). Si existe, usalo: no lo redefinas, no lo copies en tu archivo ni hagas una versión "parecida". Si existe pero no alcanza, extendelo en su archivo en lugar de crear otro.

**Los tipos y helpers nuevos que se puedan reutilizar van en estos mismos archivos**, no en el archivo que los usa por primera vez. Si no encajan en ninguno, creá un archivo nuevo en la misma carpeta (`server/src/lib/`, `client/src/lib/`) con un nombre que diga qué contiene. Lo que es privado de un solo módulo puede quedar en ese módulo.

| Qué | Dónde | Qué hay hoy |
|---|---|---|
| Errores HTTP (server) | `server/src/lib/http.ts` | `ErrorCode`, `ApiError`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `invalidTransition`, `asyncHandler` |
| Ids públicos y fechas | `server/src/lib/ids.ts` | `Prefix`, `toPublicId`, `parsePublicId`, `parseDueDate`, `formatDueDate` |
| Parámetros de ruta | `server/src/lib/params.ts` | `idParam`, `projectIdOf`, `taskIdOf`, `commentIdOf` |
| Validación y dominio (server) | `server/src/lib/validation.ts` | `EMAIL_RE`, `normalizeEmail`, `assertEmail`, `assertPassword`, `assertString`, `assertOptionalString`, `PRIORITIES`/`Priority`/`assertPriority`, `STATUSES`/`Status`/`assertStatus`/`toStatus`, `ROLES`/`Role`/`OWNER`/`ADMIN`/`MEMBER` |
| Auth y membresía | `server/src/middleware/` | `authenticate`, `signToken`, `TokenPayload`, `isMember`, `isOwner`, `requireProjectMember`, `requireTaskProjectMember` |
| Acceso a datos | `server/src/lib/db.ts` + `*.repository.ts` | `db` (Prisma), una función de repositorio por consulta |
| Tipos de la API (client) | `client/src/types.ts` | `User`, `Project`, `Task`, `TaskAssignee`, `Tag`, `TaskListResponse`, `Comment`, `HistoryEntry`, `Member`, `PRIORITIES`, `STATUSES`, `ROLES`, `Priority`, `Status`, `Role`, `isStatus`, `isPriority`, `STATUS_LABELS` |
| HTTP y sesión (client) | `client/src/lib/api.ts` | `api`, `ApiError`, `errorText`, `getToken`/`setToken`/`clearToken`, `getStoredUser`/`setStoredUser` |
| Hooks de datos (client) | `client/src/lib/` | `useAuth`, `useAsyncAction`, `useProject`, `useMembers`, `useTask`, `useTaskComments`, `useTaskHistory`, `toCreateBody`, `toUpdateBody` |
| UI compartida (client) | `client/src/lib/ui.tsx`, `client/src/components/task/` | `Loading`, `ErrorMessage`, `EmptyState`, `PrioritySelect`, `StatusSelect`, `MemberSelect`, `TaskFields`, `TaskFieldValues`, `EMPTY_TASK_FIELDS` |
| Helpers de tests de API | `server/tests/helpers.ts` | `app`, `ISO`, `apiError`, `auth`, `registerUser`, `createProject`, `createTask`, `addMember`, `setStatus` |
| UI tests (cuando exista) | `e2e/` | fixtures, page objects, componentes y clientes de API: cada uno en su capa (ver ADR-001) |

Reglas concretas:

- **No uses literales donde ya hay constante o tipo:** nada de `'IN_PROGRESS'` suelto ni `string` donde corresponde `Status`, ni regex de email propia en lugar de `EMAIL_RE`.
- **Server y client tienen tipos separados a propósito** (el client no importa de `server/`). Si cambiás la forma de una respuesta en el server, actualizá el tipo correspondiente en `client/src/types.ts`.
- **En tests, si el mismo request o armado de estado aparece en dos archivos, va en `helpers.ts`** (o en un fixture/cliente de API en `e2e/`).
- **Hay duplicaciones viejas en el código** (por ejemplo, `EMAIL_CHECK` en `projects.service.ts` repite `EMAIL_RE`). No las tomes como modelo y no las arregles salvo que te lo pidan; el código nuevo usa la versión compartida.
- **Si agregás algo compartido, sumalo a esta tabla** en el mismo commit.

### Server (`server/src/`)

- Cada módulo sigue **routes → controller → service → repository**:
  - `*.routes.ts`: rutas, middleware (`authenticate`, membresía) y `router.param` para parsear ids.
  - `*.controller.ts`: lee `req`, llama al service, arma la respuesta. Envolvé cada handler con `asyncHandler`; sin `try/catch` por handler.
  - `*.service.ts`: reglas de negocio y validación. Lanza errores con los helpers de `lib/http.ts` (`badRequest`, `notFound`, `forbidden`, `conflict`, `invalidTransition`).
  - `*.repository.ts`: único lugar que usa `db` (Prisma).
- Las respuestas usan **ids públicos con prefijo** (`user-1`, `proj-1`, `task-1`, `comment-1`, `tag-1`) vía `toPublicId` / `parsePublicId` de `lib/ids.ts`. Nunca expongas ids numéricos.
- Los errores salen siempre con el formato `{ error: { code, message, details } }` y los códigos de `ErrorCode`. No inventes códigos ni formatos nuevos.
- Cambios de esquema: nueva migración de Prisma. No edites migraciones existentes.

### Client (`client/src/`)

- Pantallas en `pages/`, piezas reutilizables en `components/`, lógica y llamadas HTTP en `lib/`. Los tipos de la API van en `types.ts`.
- Las llamadas a la API pasan por `lib/api.ts`; no uses `fetch` directo en componentes.
- Las acciones asíncronas de página usan `useAsyncAction`, y los mensajes de error, `errorText`.
- **Todo elemento interactivo o que un test necesite leer lleva `data-testid`** en kebab-case con el formato `<pieza>-<elemento>` (ej.: `comment-add-button`, `tag-chip-name`). No renombres ni borres `data-testid` existentes: los tests de UI dependen de ellos.

## Tests

La arquitectura está definida en `docs/0001-arquitectura-de-testing.md` (ADR-001). Estas reglas la resumen; ante dudas, manda el ADR.

### Reglas generales

- **Los tests describen la spec, no el código.** Escribí el resultado esperado según la especificación. Si la API no lo cumple, el test **falla y se deja fallando**: no ajustes el assert al comportamiento incorrecto ni arregles la API (salvo pedido explícito). Agregá el caso a `docs/reporte-tests-fallidos.md` con criterio (US-xx ACy), request, esperado y recibido.
- **Excepción, tests de caracterización:** si lo que te piden es fijar el comportamiento actual, va en `characterization.test.ts` y el bug conocido se marca en el nombre o en un comentario.
- **No uses `.skip`, `.only`, `xit` ni bajes umbrales de cobertura** para que la suite pase.
- **Arrange / Act / Assert** con los tres comentarios, como en los tests existentes.
- **Afirmá status y cuerpo**, y cubrí casos negativos (validación, 401, 403, 404, transiciones inválidas). Los tests nuevos no siguen el estilo viejo de mirar solo el status.
- **Cada test crea sus propios datos**, con emails/nombres únicos (ej.: prefijo por test). Nada de depender del orden, de otro test ni de los datos del seed.
- Nombres de tests en español, describiendo el comportamiento: `'el asignado (MEMBER) avanza TODO -> IN_PROGRESS'`.
- Sin `sleep` ni esperas fijas.

### API: Jest + Supertest (`server/tests/`)

- La suite **se queda como está**: estructura plana, un archivo por recurso o preocupación (`<recurso>.test.ts`). No la reorganices ni la migres a Playwright.
- Usá `helpers.ts` (`registerUser`, `createProject`, `createTask`, `addMember`, `setStatus`, `auth`, `apiError`, `ISO`) en lugar de repetir requests a mano. Si falta un helper reutilizable, agregalo ahí.
- Cada archivo corre contra su propia copia de SQLite (`globalSetup.ts` + `setup.ts`). No toques esa infraestructura ni compartas estado entre archivos.

### UI: Playwright (`e2e/`)

Todavía no existe; cuando se arme, tiene que seguir el ADR-001:

- **Organización por capa** dentro de `e2e/`: configuración, fixtures, page objects, componentes, clientes de API, tests y datos de prueba. Ni carpeta plana ni por feature.
- **Page Object Model:** una clase por pantalla (login, proyectos, tablero, detalle de tarea, miembros). Los locators viven en el page object, no en el test.
- **Component Object Model** para piezas repetidas (tarjeta de tarea, tarjeta de proyecto, ítem de comentario, ítem de miembro, header). Los page objects las componen; no dupliques sus locators.
- **Fixtures con `test.extend()`** para el estado previo: usuario, sesión, proyecto, tarea.
- **Patrón híbrido:** datos y sesión se preparan por API (`APIRequestContext` + `storageState`). El browser solo hace lo que la pantalla tiene que demostrar. **Solo el test de login usa el formulario de login.** Crear datos de setup por la UI rompe la decisión.
- **Locators por `data-testid`** (`getByTestId`) o por rol accesible. Nada de selectores CSS frágiles ni XPath.
- Los tests tienen que poder correr **en paralelo**: cada uno crea sus propios datos.
- Assertions web-first de Playwright (`await expect(locator)...`), sin `waitForTimeout`.
- **No usar Screenplay**, ni Cypress, Selenium o WebdriverIO.
- La suite de UI necesita la app levantada y su propio `.env`; no lo commitees.

## Git y commits

- **Conventional Commits** con scope: `tipo(scope): descripción` (ej.: `test(tasks): cubrir transiciones inválidas`, `docs(testing): ...`, `refactor(server): ...`). Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`.
- Descripción en español, en imperativo y minúscula.
- **Sin trailer `Co-Authored-By`** ni firmas de agentes en commits ni PRs.
- Nunca trabajes directo en `main`: usá una rama (`test/...`, `feat/...`, `fix/...`, `docs/...`, `chore/...`) y PR.
- No hagas `push`, `merge`, `rebase` ni `reset --hard` sin pedido explícito.

## Cuándo frenar y preguntar

- La tarea contradice la spec, un ADR o este archivo.
- Para terminar la tarea hace falta arreglar un bug existente.
- El cambio implica una dependencia nueva, una migración o tocar la infraestructura de tests.
- No queda claro si un comportamiento es un bug o lo esperado.
