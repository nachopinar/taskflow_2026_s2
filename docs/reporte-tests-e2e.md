# Suite end-to-end: selección, trazabilidad y defectos encontrados

- **Fecha:** 2026-10-20
- **Herramienta:** Playwright 1.63.0 (Chromium), en `e2e/`, según el [ADR-001](0001-arquitectura-de-testing.md)
- **Corrida:** `npm run test:e2e`: 41 tests, 29 pasan y 12 fallan por defectos de la app
- **Estabilidad:** 3 corridas consecutivas (`--repeat-each=3`) con resultados idénticos y 0 tests flaky

## 1. Criterio de selección

Un test E2E cuesta más que uno de API: es más lento, necesita la app levantada y tiene más piezas que pueden fallar. Por eso se automatiza en el navegador solo lo que **la pantalla tiene que demostrar**:

1. **Historias con pantalla.** Si la UI no ofrece la acción, el test no puede ser end-to-end.
2. **Recorridos de valor para el usuario**: registrarse, entrar, crear un proyecto, invitar a alguien, crear y mover tareas, comentar.
3. **Reglas cuyo efecto se ve en la UI**: la transición de estado rechazada, el filtro combinado, el orden de los comentarios, la fecha que se muestra.
4. **Escenarios con más de un usuario**, que un test de API cubre por separado y acá se ven integrados (el owner invita y el invitado ve el proyecto).
5. **Un caso negativo por formulario**: alcanza para demostrar que la pantalla muestra el error de la API. Las matrices de validación (cada regla de la contraseña, cada límite de longitud) son contrato de la API y quedan en Jest.

### Historias que no se automatizan en E2E

| Historia | Motivo |
|----------|--------|
| US-09 Editar proyecto | La UI no permite editar proyectos. |
| US-10 Eliminar proyecto | La UI no permite eliminar proyectos. |
| US-17 Recuperar contraseña | No hay pantalla de recuperación. |
| US-02 AC5 (reinicio del contador) | No depende de la UI y ya está en `server/tests/auth-findings.test.ts`. |
| US-01 AC3 (contraseña de 7 caracteres) | Es una regla de validación de la API y ya está en `auth-findings.test.ts`. |
| US-07 AC7 (paginación) | El tablero no pagina. Es contrato de la API. |
| RNF de rendimiento y concurrencia | No son verificables de forma confiable desde el navegador. |

## 2. Trazabilidad

✅ pasa · ❌ falla por un defecto de la app (`@known-bug`)

| Spec | Test | Criterio | Resultado |
|------|------|----------|-----------|
| `auth/login` | con credenciales válidas entra a sus proyectos con la sesión iniciada | US-02 AC1 | ✅ |
| `auth/login` | muestra el mismo error para contraseña incorrecta y para email inexistente | US-02 AC2, AC3 · RNF Seg. 3 | ✅ |
| `auth/login` | tras 5 intentos fallidos la cuenta se bloquea y rechaza las credenciales correctas | US-02 AC4 | ✅ |
| `auth/register` | registra la cuenta, inicia sesión y guarda el email en minúsculas | US-01 AC2, AC5 | ✅ |
| `auth/register` | rechaza una contraseña débil indicando el requisito y no crea la cuenta | US-01 AC3, AC6 | ✅ |
| `auth/register` | rechaza un email ya registrado aunque cambien las mayúsculas | US-01 AC2, AC4 | ✅ |
| `auth/session` | una ruta protegida redirige al login | Convención de autenticación | ✅ |
| `auth/session` | cerrar sesión vuelve al login y la ruta protegida deja de estar accesible | Convención de autenticación | ✅ |
| `projects/projects` | el proyecto creado aparece en la lista con su descripción | US-03 AC2, AC5 | ✅ |
| `projects/projects` | rechaza un nombre de menos de 3 caracteres | US-03 AC1 | ❌ D1 |
| `projects/projects` | muestra los proyectos propios y no los de otros usuarios | US-04 AC1 | ✅ |
| `projects/projects` | un usuario sin proyectos ve la lista vacía sin errores | US-04 AC4 | ✅ |
| `projects/members` | el owner agrega un miembro por email y el miembro pasa a ver el proyecto | US-11 AC2 | ✅ |
| `projects/members` | informa el error si no existe un usuario con ese email | US-11 AC2 | ✅ |
| `projects/members` | un miembro que no es owner no puede administrar los miembros | US-11 AC1 | ✅ |
| `projects/members` | un miembro quitado deja de ver el proyecto | US-11 AC5 | ✅ |
| `projects/members` | al quitar un miembro sus tareas quedan sin asignar | US-11 AC6 | ❌ D2 |
| `tasks/board` | la tarea creada aparece en la columna TODO con su prioridad | US-05 AC2, AC3, AC6 | ✅ |
| `tasks/board` | rechaza un título de menos de 3 caracteres | US-05 AC1 | ✅ |
| `tasks/board` | mueve la tarea de TODO a IN_PROGRESS desde el tablero | US-06 AC1 | ✅ |
| `tasks/board` | no permite pasar de TODO a DONE directamente | US-06 AC2, AC4 | ❌ D3 |
| `tasks/board` | no permite reabrir una tarea DONE | US-06 AC3, AC4 | ✅ |
| `tasks/task-detail` | registra exactamente las transiciones aplicadas | US-06 AC7 y escenario de historial | ❌ D4 |
| `tasks/filters` | filtra por prioridad | US-07 AC3 | ✅ |
| `tasks/filters` | combina el filtro de prioridad con el de asignado | US-07 AC5 | ❌ D5 |
| `tasks/filters` | busca por texto en el título | US-07 AC4 | ✅ |
| `tasks/filters` | la búsqueda no distingue mayúsculas de minúsculas | US-07 AC4 | ❌ D6 |
| `tasks/filters` | un texto con comillas se busca como dato y no rompe el listado | RNF Seguridad 1 | ❌ D7 |
| `tasks/comments` | publica un comentario propio en la tarea | US-08 AC1, AC3 | ✅ |
| `tasks/comments` | muestra los comentarios del más antiguo al más reciente | US-08 AC4 | ❌ D8 |
| `tasks/comments` | solo se pueden borrar los comentarios propios | US-08 AC6 | ✅ |
| `tasks/task-detail` | los cambios de título y prioridad se ven en el tablero | US-12 AC1 | ✅ |
| `tasks/task-detail` | al borrar la tarea vuelve al tablero y la tarea ya no está | US-13 AC3 | ✅ |
| `tasks/assignment` | el owner suma un miembro y le asigna una tarea sin cambiar su estado | US-14 AC1, AC4, AC5 · US-11 | ✅ |
| `tasks/assignment` | desasigna una tarea | US-14 AC3 | ✅ |
| `tasks/tags` | agrega una etiqueta y la quita | US-15 | ✅ |
| `tasks/tags` | guarda la etiqueta en minúsculas y sin espacios en los extremos | US-15 AC1 | ❌ D9 |
| `tasks/tags` | no duplica una etiqueta que ya tiene, aunque cambien las mayúsculas | US-15 AC2, AC3 | ❌ D10 |
| `tasks/due-date` | la fecha cargada se muestra igual en el detalle y en el tablero | US-16 AC1, AC2, AC3 | ❌ D11 |
| `tasks/due-date` | se puede quitar la fecha de vencimiento | US-16 AC5 | ✅ |
| `tasks/due-date` | editar el título no modifica la fecha de vencimiento | US-16 AC3 · US-12 AC6 | ❌ D11 |

## 3. Defectos detectados

Ninguno de estos tests se ajustó al comportamiento actual ni se marcó con `test.fail()`. Describen lo que pide la especificación y siguen en rojo hasta que se corrija el defecto, con el mismo criterio que [`reporte-tests-fallidos.md`](reporte-tests-fallidos.md). Para correr la suite sin ellos: `npm --prefix e2e run test:no-known-bugs`.

| # | Criterio | Qué ve el usuario | Dónde mirar |
|---|----------|-------------------|-------------|
| D1 | US-03 AC1 | El proyecto "ab" se crea sin error. | `createProject` en `projects.service.ts` valida solo el máximo. |
| D2 | US-11 AC6 | La tarea sigue mostrando como asignado al ex-miembro. | `removeMember` en `projects.service.ts` no libera las tareas. |
| D3 | US-06 AC2 | Una tarea TODO pasa directo a la columna DONE. | `FORBIDDEN_TRANSITIONS` en `transitions.ts` no incluye TODO → DONE. |
| D4 | US-06 AC7 | El historial muestra 3 entradas ("— → TODO" de la creación) en lugar de las 2 transiciones. | `createTask` en `tasks.service.ts` inserta una entrada de historial. |
| D5 | US-07 AC5 | Con prioridad HIGH y un asignado, aparecen tareas LOW de ese asignado. | `buildFilters` en `tasks.repository.ts` reemplaza el filtro en vez de acumularlo. |
| D6 | US-07 AC4 | Buscar "login" no encuentra "Implementar Login". | `findTasks` usa `instr`, que distingue mayúsculas. |
| D7 | RNF Seg. 1 | Buscar "O'Brien" muestra "Unexpected server error". | `findTasks` arma el SQL con `$queryRawUnsafe` y concatena el texto: además del error es una **inyección SQL**. |
| D8 | US-08 AC4 | Los comentarios aparecen del más nuevo al más viejo. | `listByTask` en `comments.repository.ts` ordena `desc`. |
| D9 | US-15 AC1 | La etiqueta "Backend" se guarda con mayúscula. | `addTag` en `tasks.service.ts` no pasa el nombre a minúsculas. |
| D10 | US-15 AC2-3 | "bug" y "BUG" quedan como dos etiquetas en la misma tarea. | `addTag` no normaliza el nombre ni verifica si la tarea ya tiene la etiqueta. |
| D11 | US-16 AC3 | Se carga 2026-09-15 y se muestra 2026-09-14. Peor aún: cada vez que se guarda la tarea desde el detalle (por ejemplo, para cambiar el título), la fecha retrocede un día más. | `formatDueDate` en `lib/ids.ts` usa los getters locales (`getDate`) sobre una fecha guardada en UTC. |

### Cómo se verificó que los rojos son defectos reales (sin falsos negativos)

Se aplicó en `server/src` una corrección mínima y temporal para cada defecto D1-D11 y se corrió la suite completa tres veces: **123/123 en verde**, también con 8 workers. Después las correcciones se revirtieron con `git checkout`. Cada test `@known-bug` falla por su defecto y por nada más, y ningún test que pasa depende de un defecto para pasar.

## 4. Decisiones contra falsos positivos e inestabilidad

- **Cada acción espera a que la pantalla termine de reaccionar.** `BasePage.mutate` espera la respuesta de la escritura y la recarga que la pantalla hace después. Sin esa espera, aserciones como `toHaveCount(1)` o `toHaveCount(0)` podrían evaluarse contra la lista anterior y pasar sin que la app haga lo correcto.
- **Antes de afirmar una ausencia, se confirma que los datos cargaron.** Los `goto` esperan a que la lista o el tablero estén montados y sin indicador de carga.
- **Se prueba el build de producción** (`vite build` + `vite preview`). En el servidor de desarrollo, `React.StrictMode` ejecuta dos veces cada efecto. La segunda carga de la tarea resincroniza el formulario y pisa lo que el test ya había elegido. Ese comportamiento solo existe en desarrollo y producía fallos intermitentes que no son defectos de la app.
- **Zona horaria fija** (`America/Montevideo`, UTC-3) en el servidor y en el navegador. Así D11 se reproduce siempre, sin depender de la máquina. La spec exige que la fecha no dependa de la zona horaria del servidor, así que la condición es válida.
- **El servidor y la base son siempre de la suite** (`reuseExistingServer: false`, puertos 3100/5174, `server/prisma/e2e.db`). Un servidor reutilizado podría tener otra zona horaria y hacer pasar D11 en falso.
- **Datos propios por test** (emails y nombres únicos), creados por API. Los tests son independientes y corren en paralelo.
- **Sin reintentos** (`retries: 0`): un test que pasa al segundo intento esconde un problema.
- **Locators por `data-testid` con texto exacto**, para no confundir "Tarea 1" con "Tarea 10".

## 5. Observaciones fuera de la especificación

No tienen test porque la spec no define cómo debe comportarse la UI en estos casos, pero conviene revisarlas:

- **La pantalla de miembros no lista a todos los miembros.** No hay endpoint para listarlos, así que muestra al owner, a quienes tienen tareas asignadas y a los que se agregaron desde ese mismo navegador (los guarda en `localStorage`). Un miembro agregado desde otro dispositivo no aparece ni en esa pantalla ni en el select de asignado. Por eso los tests que necesitan ver a un miembro le asignan una tarea en el arrange.
- **Las etiquetas desaparecen del detalle al guardar o cambiar el estado.** `PATCH /tasks/:id` devuelve la tarea sin `tags` y la pantalla reemplaza la tarea con esa respuesta. Vuelven al recargar. Lo detecté leyendo el código; no está cubierto por un test.
- **El autor de un comentario se muestra como id (`user-5`)** cuando el autor no figura entre los miembros conocidos por la pantalla.
