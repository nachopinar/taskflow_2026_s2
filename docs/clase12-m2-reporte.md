# Clase 12 · Módulo 2: seguridad y accesibilidad

Ejecutado el 2026-11-03 sobre la rama `dev` (`69f7a27`), con API local y base SQLite de prueba.

**Adaptación al repo:** `apps/api` → `server/`, `apps/web` → `client/`, `:3001/...` → `:3000/api/...`, `alice@taskflow.dev` → `ana@test.com`, `bob@taskflow.dev` → `bob@test.com`, `assignedTo` → `assigneeId`, `e2e/playwright/tests/` → `e2e/tests/`.

## Pruebas de seguridad

### Dependencias (`npm audit`)

El repo no usa workspaces, así que se auditó cada paquete.

| Paquete | HIGH + CRITICAL | Solo producción (`--omit=dev`) |
|---|---:|---:|
| raíz | 1 | 0 |
| `server` | 8 | 6 |
| `client` | 9 | 3 |
| `e2e` | 0 | 0 |

| Vulnerabilidad | Severidad | ¿Dónde corre? | Arreglo | Riesgo real |
|---|---|---|---|---|
| `express` 4.21.2 (vía `body-parser`, `path-to-regexp`, `qs`) | HIGH | Producción: API | 4.22.3, no *breaking* | Alto: denegación de servicio en una API expuesta |
| `vitest` 3.2.4 | CRITICAL | Solo desarrollo y test | 3.2.7, no *breaking* | Bajo: no viaja a producción |

### Headers (`/api/health` y `/api/projects`)

| Header | ¿Aparece? | Valor |
|---|---|---|
| Content-Security-Policy | No | - |
| Strict-Transport-Security | No | - |
| X-Frame-Options | No | - |
| X-Content-Type-Options | No | - |
| X-Powered-By | Sí, sobra | `Express` |
| Access-Control-Allow-Origin | Sí, permisivo | `*` |

### Control de acceso (Bob no es miembro del proyecto de Ana)

| Request | Resultado |
|---|---|
| `GET /projects/:id` | 404 para todos: la ruta no existe |
| `GET /projects/:id/tasks`, `POST` de tarea | 403 |
| `GET /tasks/:id`, `/history`, `/comments` | 403 |
| `PATCH /tasks/:id` con `status` | 403 |
| `PATCH /tasks/:id` con `title` | **200** |
| `DELETE /tasks/:id` | **204** |

### Inyección y tokens

Las expectativas se escribieron antes de ejecutar, a partir del código.

| Prueba | Esperaba | Pasó | Código que lo explica |
|---|---|---|---|
| SQLi en login | 401 | 401 | Prisma parametriza |
| SQLi en `search`, payload de la guía | 500 | 500 (`near "ORDER"`) | `$queryRawUnsafe` concatena el texto |
| SQLi en `search`, `') OR 1=1 --` | 200 con datos ajenos | 500: faltaba cerrar un paréntesis | Ídem |
| SQLi en `search`, `')) OR 1=1 --` | 200 con datos ajenos | **200 con 13 tareas de 3 proyectos, incluida una privada de Ana** | Ídem |
| XSS almacenado por la UI | Texto, sin `alert` | Texto, sin `alert`, en lista y detalle | React escapa; no hay `dangerouslySetInnerHTML` |
| Token `alg: none` | 401 | 401 | `jwt.verify` exige firma |

### Extra

- **Cuentas:** tras 5 fallos, la cuenta existente responde `Account temporarily locked`; la inexistente siempre `Invalid credentials`. Eso revela qué emails existen y permite bloquear 15 minutos una cuenta ajena: durante el bloqueo, la contraseña correcta también da 401.
- **Asignación:** asignar a Bob, que no es miembro, da 400 y no expone sus datos. Con `assignedTo`, campo inexistente, da 500 porque `createTask` pasa el body completo a Prisma.

## Hallazgos de seguridad

| SEC-01 | |
|---|---|
| **Título** | Inyección SQL en la búsqueda de tareas |
| **Severidad** | CRITICAL |
| **Descripción** | `findTasks` concatena `search` en `$queryRawUnsafe` (`server/src/modules/tasks/tasks.repository.ts:33`). |
| **Pasos de reproducción** | 1. Iniciar sesión como Bob y crear un proyecto propio.<br>2. `GET /api/projects/:id/tasks` con `search=')) OR 1=1 --`: devuelve tareas de todos los proyectos, incluida la privada de Ana, donde Bob no es miembro.<br>3. Con `search=')) UNION SELECT id,<id>,email,substr(passwordHash,1,7),'TODO','LOW',NULL,NULL,createdAt,createdAt FROM users --`, donde `<id>` es el número del proyecto: devuelve emails y el inicio de cada hash. |
| **Impacto** | Cualquier usuario registrado lee toda la base, incluidos emails y hashes de contraseñas. |
| **Remediación propuesta** | Usar el query builder de Prisma o `$queryRaw` parametrizado. |

| SEC-02 | |
|---|---|
| **Título** | Editar o borrar tareas de proyectos ajenos |
| **Severidad** | HIGH |
| **Descripción** | `PATCH` y `DELETE /tasks/:taskId` no usan `requireTaskProjectMember` (`server/src/modules/tasks/tasks.routes.ts:17-18`). |
| **Pasos de reproducción** | 1. Ana crea un proyecto y dos tareas.<br>2. Bob envía `PATCH /api/tasks/:id` con `{"title":"Modificada por Bob"}`: 200.<br>3. Bob envía `DELETE /api/tasks/:id`: 204, y la tarea desaparece de la lista de Ana. |
| **Impacto** | Cualquier usuario registrado altera o borra tareas ajenas. Los ids son secuenciales (`task-13`), así que se pueden recorrer. |
| **Remediación propuesta** | Agregar `requireTaskProjectMember()` a ambas rutas, y exigir el rol que pida la spec para borrar. |

**Otros candidatos**

- **HIGH:** secreto JWT por defecto en el código (`server/src/middleware/auth.ts:5`), sin `JWT_SECRET` en `.env.example`. Un token firmado con ese valor fue aceptado.
- **MEDIUM:** bloqueo de cuentas ajenas y enumeración de emails (ver Extra).
- **MEDIUM:** faltan headers de seguridad y CORS abierto (`server/src/app.ts:12`).
- **LOW:** `X-Powered-By` revela la tecnología; un campo desconocido en el body da 500.

## Control verificado

| Control de seguridad verificado | |
|---|---|
| **Qué se probó** | Acceder a `GET /api/projects` con un token `alg: none` sin firma |
| **Resultado esperado** | 401 |
| **Resultado obtenido** | 401 `Invalid or expired token` |
| **Qué parte del código lo explica** | `jwt.verify` en `server/src/middleware/auth.ts:32` |

También resistieron la SQLi en login, el XSS almacenado y las lecturas de Bob sobre el proyecto de Ana.

## Hallazgos de accesibilidad

Axe da 0 violaciones en Login, Registro, Proyectos y Detalle de proyecto; un control con un input sin label confirmó que sí detecta. Por eso se sumó **Detalle de tarea**, donde sí hay violaciones.

| ACC-01 | |
|---|---|
| **SC WCAG 2.1** | 4.1.2 Nombre, función, valor |
| **Nivel** | A |
| **Principio POUR** | Robusto |
| **Cómo se detectó** | axe-core (`label`, CRITICAL) |
| **Vista afectada** | Detalle de tarea |
| **Descripción del fallo** | `tag-add-input` y `comment-add-input` no tienen nombre accesible. |
| **Fix propuesto** | Agregar `aria-label`. **Aplicado y verificado.** |

| ACC-02 | |
|---|---|
| **SC WCAG 2.1** | 2.4.2 Titulado de páginas |
| **Nivel** | A |
| **Principio POUR** | Operable |
| **Cómo se detectó** | Revisión manual |
| **Vista afectada** | Todas: comprobado en Login y Proyectos; el `<title>` es único y fijo |
| **Descripción del fallo** | El título siempre es `TaskFlow`, así que no indica en qué pantalla se está. |
| **Fix propuesto** | Fijar un título por ruta, por ejemplo `Proyectos · TaskFlow`. |

| ACC-03 | |
|---|---|
| **SC WCAG 2.1** | 3.1.2 Idioma de las partes |
| **Nivel** | AA |
| **Principio POUR** | Comprensible |
| **Cómo se detectó** | Revisión manual |
| **Vista afectada** | Login |
| **Descripción del fallo** | El error muestra `Invalid credentials` en inglés dentro de una página con `lang="es"`. |
| **Fix propuesto** | Mostrar el mensaje en español, por ejemplo "Email o contraseña incorrectos". |

**Revisión manual:** teclado, foco e idioma se recorrieron con Tab y Enter reales desde Playwright. No se probó con lector de pantalla.

| Prueba | Resultado |
|---|---|
| Teclado | Correcto: se llega a las tarjetas con Tab y Enter abre el proyecto |
| Idioma | Correcto: `<html lang="es">` |
| Mensajes de error | El atributo está: `role="alert"`. Falla el contenido (ACC-03) |

**Corrección:** con `VERIFICAR.regla = 'label'`, el test falló antes del fix (`Received: ["label"]`) y pasó después. Ejecutar desde `e2e/`, con Node 20 o superior: `npx playwright test a11y --project=chromium`.

## User stories de remediación

| US de Seguridad: SEC-01 | |
|---|---|
| **Como** | usuario de TaskFlow |
| **Quiero** | que la búsqueda de tareas trate el texto como dato y no como SQL |
| **Para** | que nadie pueda leer datos ajenos desde el buscador |
| **CA-01** | `search=')) OR 1=1 --` responde 200 y `items` solo tiene tareas del proyecto consultado. |
| **CA-02** | El payload con `UNION SELECT ... FROM users` responde 200 sin datos de usuarios. |
| **CA-03** | `grep -r queryRawUnsafe server/src` no devuelve resultados. |

ACC-01 ya está corregido, así que la historia cubre el hallazgo más grave pendiente.

| US de Accesibilidad: ACC-02 | |
|---|---|
| **Como** | persona que usa un lector de pantalla |
| **Quiero** | que cada pantalla tenga un título propio |
| **Para** | saber dónde estoy sin recorrer toda la página |
| **CA-01** | Un test de Playwright verifica con `toHaveTitle` `Ingresar · TaskFlow` en `/login` y `Proyectos · TaskFlow` en `/projects`. |
| **CA-02** | En el tablero, el título incluye el nombre del proyecto abierto. |
| **CA-03** | Axe no reporta `document-title` en las 5 vistas auditadas. |
