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
| **Severidad** | **6.5 MEDIUM** (CVSS 3.1 base) · [`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`](https://www.first.org/cvss/calculator/3.1#CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N). Antes se había calificado CRITICAL a criterio; ver [justificación](#cvss-31-de-sec-01-y-sec-02). |
| **Descripción** | `findTasks` concatena `search` en `$queryRawUnsafe` (`server/src/modules/tasks/tasks.repository.ts:33`). |
| **Pasos de reproducción** | 1. Iniciar sesión como Bob y crear un proyecto propio.<br>2. `GET /api/projects/:id/tasks` con `search=')) OR 1=1 --`: devuelve tareas de todos los proyectos, incluida la privada de Ana, donde Bob no es miembro.<br>3. Con `search=')) UNION SELECT id,<id>,email,substr(passwordHash,1,7),'TODO','LOW',NULL,NULL,createdAt,createdAt FROM users --`, donde `<id>` es el número del proyecto: devuelve emails y el inicio de cada hash. |
| **Impacto** | Cualquier usuario registrado lee toda la base, incluidos emails y hashes de contraseñas. |
| **Remediación propuesta** | Usar el query builder de Prisma o `$queryRaw` parametrizado. |

| SEC-02 | |
|---|---|
| **Título** | Editar o borrar tareas de proyectos ajenos |
| **Severidad** | **8.3 HIGH** (CVSS 3.1 base) · [`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:H`](https://www.first.org/cvss/calculator/3.1#CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:H); ver [justificación](#cvss-31-de-sec-01-y-sec-02). |
| **Descripción** | `PATCH` y `DELETE /tasks/:taskId` no usan `requireTaskProjectMember` (`server/src/modules/tasks/tasks.routes.ts:17-18`). |
| **Pasos de reproducción** | 1. Ana crea un proyecto y dos tareas.<br>2. Bob envía `PATCH /api/tasks/:id` con `{"title":"Modificada por Bob"}`: 200.<br>3. Bob envía `DELETE /api/tasks/:id`: 204, y la tarea desaparece de la lista de Ana. |
| **Impacto** | Cualquier usuario registrado altera o borra tareas ajenas. Los ids son secuenciales (`task-13`), así que se pueden recorrer. |
| **Remediación propuesta** | Agregar `requireTaskProjectMember()` a ambas rutas, y exigir el rol que pida la spec para borrar. |

### CVSS 3.1 de SEC-01 y SEC-02

Puntajes base calculados con la [calculadora de FIRST](https://www.first.org/cvss/calculator/3.1) (los links de la fila de severidad abren cada vector ya cargado). Los supuestos se verificaron el 2026-11-17 contra la API local (rama `dev`, `eb8fe38`), con usuarios y proyectos nuevos.

| Métrica | SEC-01 (SQLi en búsqueda) | SEC-02 (PATCH/DELETE sin membresía) |
|---|---|---|
| **AV** Vector de ataque | **N**: request HTTP a la API | **N**: request HTTP a la API |
| **AC** Complejidad | **L**: un único payload en `search`, sin condiciones de carrera | **L**: basta con el id de la tarea, que es secuencial (`task-13`) |
| **PR** Privilegios | **L**: hace falta un token de cualquier usuario y un proyecto propio | **L**: hace falta un token de cualquier usuario, sin ser miembro |
| **UI** Interacción | **N** | **N** |
| **S** Alcance | **U**: la base que se lee es la de la propia API | **U**: solo afecta datos de la API |
| **C** Confidencialidad | **H**: con `UNION SELECT` se lee cualquier tabla, incluidos emails y hashes de `users` | **L**: `PATCH` con body `{}` responde 200 con la tarea ajena completa (título, descripción, proyecto); no expone comentarios, historial ni usuarios |
| **I** Integridad | **N**: un `UPDATE` apilado (`x')); UPDATE tasks SET title='pwned' ... --`) respondió 200 y la tarea quedó igual; Prisma ejecuta una sola sentencia | **H**: se modifica cualquier campo de cualquier tarea de cualquier proyecto |
| **A** Disponibilidad | **N**: no se logró degradar el servicio; los payloads mal formados dan 500 solo a quien los envía | **H**: `DELETE` borra la tarea con sus comentarios, historial y tags (Ana recibe 404 después); recorriendo ids se vacían todos los proyectos |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:H` |
| **Puntaje base** | **6.5 MEDIUM** | **8.3 HIGH** |

**Por qué SEC-01 baja de CRITICAL a MEDIUM:** el puntaje base solo mide lo demostrado (lectura). Con `PR:N` sería 7.5, pero el registro abierto igual exige un token, que es `PR:L`. El impacto real puede ser mayor, porque con los hashes se puede intentar crackear contraseñas y tomar cuentas, pero eso es un ataque encadenado que CVSS base no suma. Por eso se mantiene como **primera prioridad de remediación** junto a SEC-02.

**Otros candidatos**

- **HIGH:** secreto JWT por defecto en el código (`server/src/middleware/auth.ts:5`), sin `JWT_SECRET` en `.env.example`. Un token firmado con ese valor fue aceptado.
- **MEDIUM:** bloqueo de cuentas ajenas y enumeración de emails (ver Extra).
- **MEDIUM:** faltan headers de seguridad y CORS abierto (`server/src/app.ts:12`).
- **LOW:** `X-Powered-By` revela la tecnología; un campo desconocido en el body da 500.

## OWASP ZAP: cruce con los hallazgos manuales

Baseline scan (ZAP 2.17.0, imagen `ghcr.io/zaproxy/zaproxy:stable`) ejecutado el 2026-11-17 sobre `dev` (`eb8fe38`) con la app local de `npm run dev`. Son dos corridas porque el frontend y la API están en puertos distintos:

| Objetivo | Comando | Reporte |
|---|---|---|
| Frontend (Vite) | `zap-baseline.py -t http://host.docker.internal:5174 -j` | [`zap/zap-baseline-web.html`](zap/zap-baseline-web.html) · [JSON](zap/zap-baseline-web.json) |
| API (Express) | `zap-baseline.py -t http://host.docker.internal:3000/api/projects` | [`zap/zap-baseline-api.html`](zap/zap-baseline-api.html) · [JSON](zap/zap-baseline-api.json) |

Para reproducir: con `npm run dev` levantado, iniciar otro Vite accesible desde Docker (`cd client && npx vite --host 0.0.0.0 --port 5174`), porque el de `:5173` solo escucha en `localhost`; después, desde la raíz, `docker run --rm -v "<ruta>/docs/zap:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py <args> -r <reporte>.html -J <reporte>.json -I`. `-j` suma el AJAX spider, necesario porque el frontend es una SPA. El baseline es **pasivo**: navega y mira las respuestas, no envía ataques ni usa token.

Resultado: 0 FAIL; 10 reglas en WARN en el frontend (7 de riesgo Medium o Low y 3 informativas) y 3 en la API (2 de riesgo y 1 informativa).

| Alerta ZAP (id) | Riesgo ZAP | Dónde | Hallazgo manual relacionado | Cruce |
|---|---|---|---|---|
| Content Security Policy (CSP) Header Not Set (10038) | Medium | Web: `/`, `/login` | Headers: CSP "No" | **Coincide**, pero ZAP lo marca en el HTML del frontend y la revisión manual en la API (ver nota) |
| Missing Anti-clickjacking Header (10020) | Medium | Web: `/` | Headers: X-Frame-Options "No" | **Coincide** (ídem) |
| X-Content-Type-Options Header Missing (10021) | Low | Web: `/`, `/src/main.tsx` | Headers: X-Content-Type-Options "No" | **Coincide** (ídem) |
| Cross-Domain Misconfiguration (10098) | Medium | API: `/api/projects` y demás; web: archivos de Vite | Headers: CORS `*`; candidato MEDIUM (`server/src/app.ts:12`) | **Coincide** en la API. En la web el `*` lo pone el servidor de desarrollo de Vite |
| Server Leaks Information via "X-Powered-By" (10037) | Low | API: todas las rutas; web: `/api/auth/login` vía proxy | Headers: `X-Powered-By: Express`; candidato LOW | **Coincide** |
| Permissions Policy Header Not Set (10063) | Low | Web | No se había revisado | **Nuevo de ZAP** (mismo origen: no hay middleware de headers) |
| Cross-Origin-Embedder-Policy / Cross-Origin-Opener-Policy Missing (90004) | Low | Web | No se había revisado | **Nuevo de ZAP** (ídem) |
| Information Disclosure - Suspicious Comments (10027) | Info | Web: `node_modules/.vite/deps/*.js` | - | **Falso positivo**: son `TODO` de React y React Router servidos por el servidor de desarrollo, no código de TaskFlow |
| Storable and Cacheable Content / Non-Storable Content (10049) | Info | Web y API | - | Informativo, sin riesgo: no hay datos sensibles cacheables sin token |
| Modern Web Application (10109) | Info | Web | - | Informativo: avisa que conviene el AJAX spider, que ya se usó |
| No lo detecta | - | - | Strict-Transport-Security ausente | Esperable: ZAP solo la reporta sobre HTTPS y la app local corre en HTTP |
| No lo detecta | - | - | **SEC-01** SQLi en `search` | El baseline no ataca y sin token no llega a `GET /projects/:id/tasks`. Haría falta un *active scan* autenticado |
| No lo detecta | - | - | **SEC-02** PATCH/DELETE sin membresía | Control de acceso entre dos usuarios: ningún escáner lo ve sin conocer las reglas de negocio |
| No lo detecta | - | - | Secreto JWT por defecto, enumeración y bloqueo de cuentas, 500 por campo desconocido | Requieren leer el código o enviar requests específicas |
| No lo detecta | - | - | Dependencias vulnerables (`npm audit`) | Fuera de alcance de ZAP; lo cubre `npm audit` |

**Nota sobre la API:** sin token, el spider solo recibe respuestas 401 y 404 en JSON. ZAP no evalúa CSP ni anti-clickjacking en respuestas que no son HTML, y a su umbral por defecto tampoco X-Content-Type-Options en errores 4xx. Por eso esos tres headers aparecen solo en el frontend, aunque la API tampoco los envía (`curl -i` a `/api/health`, tabla de headers de arriba).

**Conclusión:** ZAP confirma los 5 hallazgos de headers y CORS, y suma 3 headers que no se habían revisado (Permissions-Policy, COEP, COOP), todos con la misma remediación: agregar un middleware de headers (por ejemplo `helmet`) y restringir el origen de CORS. Los dos hallazgos más graves, SEC-01 y SEC-02, solo aparecieron en la revisión manual: el escaneo pasivo complementa las pruebas manuales, no las reemplaza.

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
