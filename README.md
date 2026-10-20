# TaskFlow

Gestor de tareas colaborativo. Los usuarios crean proyectos, invitan miembros, cargan tareas con prioridad y fecha de vencimiento, las mueven entre estados y comentan sobre ellas.

Este es el proyecto sobre el que vas a trabajar durante todo el semestre en **Testing y Calidad de Software**.

## Requisitos

- **Node.js 20 o superior** y **npm 10 o superior** (verificá con `node -v` y `npm -v`)
- **Git**

No hace falta Docker ni instalar una base de datos: TaskFlow usa SQLite, que es un archivo.

Funciona igual en macOS, Linux y Windows. El único paso que cambia según el
sistema operativo es la copia del archivo de configuración `server/.env`; el
resto (`npm install`, `npm run db:setup`, `npm run dev`) es idéntico en todos.

## Puesta en marcha

### macOS / Linux

```bash
git clone <url-del-repo>
cd taskflow
npm install
cp server/.env.example server/.env
npm run db:setup
npm run dev
```

### Windows (PowerShell)

```powershell
git clone <url-del-repo>
cd taskflow
npm install
Copy-Item server\.env.example server\.env
npm run db:setup
npm run dev
```

En `cmd.exe`, reemplazá la línea del `.env` por `copy server\.env.example server\.env`.

### Verificar que levantó

`npm run dev` arranca dos procesos a la vez: la API en `http://localhost:3000/api`
y el frontend en `http://localhost:5173`. Se cortan con `Ctrl+C`.

Abrí `http://localhost:5173` en el navegador o consultá la API:

```bash
curl http://localhost:3000/api/health
```

En Windows, `curl` dentro de PowerShell es un alias de `Invoke-WebRequest`; para
que se comporte como en el ejemplo usá `curl.exe http://localhost:3000/api/health`
o abrí la URL en el navegador.

## Usuarios de prueba

El comando `db:setup` carga datos de ejemplo. Los tres usuarios comparten la contraseña `Password1`:

| Email | Rol en los datos de ejemplo |
|-------|------------------------------|
| `ana@test.com` | Owner de "Rediseño del sitio", miembro de "Migración legacy" |
| `bob@test.com` | Owner de "App móvil", miembro de "Rediseño del sitio" |
| `caro@test.com` | Miembro de "App móvil" |

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Levanta la API y el frontend juntos, con recarga automática |
| `npm run dev:server` | Levanta solo la API |
| `npm run dev:client` | Levanta solo el frontend |
| `npm run build` | Compila TypeScript a `server/dist` |
| `npm run build:client` | Compila el frontend a `client/dist` |
| `npm start` | Corre la versión compilada |
| `npm run db:setup` | Aplica las migraciones y carga los datos de ejemplo |
| `npm run db:reset` | Borra la base y la vuelve a crear desde cero |
| `npm test` | Corre la suite de tests |
| `npm run test:coverage` | Corre la suite con reporte de cobertura |

## Frontend

En `client/` hay una interfaz web en React 18 + TypeScript + Vite. Se levanta
junto con la API con `npm run dev` y queda en `http://localhost:5173`; el
servidor de Vite hace proxy de `/api` hacia `http://localhost:3000`. El token
de sesión se guarda en `localStorage`.

Pantallas:

- **Login / registro**: un formulario con un toggle entre iniciar sesión y
  crear cuenta.
- **Lista de proyectos**: los proyectos del usuario y un formulario para crear
  uno nuevo.
- **Tablero del proyecto**: columnas TODO, IN_PROGRESS y DONE con las tareas,
  filtros por prioridad y asignado, buscador por texto y alta de tareas.
- **Detalle de tarea**: edición de título, descripción, prioridad, asignado y
  fecha de vencimiento; cambio de estado; etiquetas; comentarios; historial de
  estados.
- **Miembros del proyecto**: alta por email y baja de miembros (solo el owner).

## Endpoints

Todas las rutas cuelgan de `/api`. Salvo las de autenticación, todas requieren la cabecera `Authorization: Bearer <token>`.

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Login, devuelve JWT |
| POST | `/auth/forgot-password` | Solicita el reseteo de contraseña |
| POST | `/auth/reset-password` | Cambia la contraseña con el token |

### Proyectos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/projects` | Crear proyecto |
| GET | `/projects` | Listar mis proyectos |
| PATCH | `/projects/:id` | Editar proyecto |
| DELETE | `/projects/:id` | Eliminar proyecto |
| POST | `/projects/:id/members` | Agregar miembro por email |
| DELETE | `/projects/:id/members/:userId` | Quitar miembro |

### Tareas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/projects/:id/tasks` | Listar tareas. Filtros: `status`, `priority`, `assignedTo`, `search`, `limit`, `offset` |
| POST | `/projects/:id/tasks` | Crear tarea |
| GET | `/tasks/:id` | Detalle de una tarea |
| PATCH | `/tasks/:id` | Editar tarea (título, descripción, prioridad, asignado, vencimiento, estado) |
| DELETE | `/tasks/:id` | Eliminar tarea |
| GET | `/tasks/:id/history` | Historial de cambios de estado |
| POST | `/tasks/:id/tags` | Agregar etiqueta |
| DELETE | `/tasks/:id/tags/:tagId` | Quitar etiqueta |

### Comentarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/tasks/:id/comments` | Listar comentarios de una tarea |
| POST | `/tasks/:id/comments` | Comentar en una tarea |
| DELETE | `/comments/:id` | Borrar un comentario propio |

## Identificadores

La API expone los recursos con identificadores prefijados: `user-1`, `proj-1`, `task-1`, `comment-1`.

## Formato de errores

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

Códigos: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `INVALID_TRANSITION` (422), `INTERNAL` (500).

## Estado de los tests

El proyecto viene con una suite de tests que cubre los flujos principales de autenticación, proyectos, tareas y comentarios. Corre en verde:

```bash
npm test
```

Está lejos de ser exhaustiva — ampliarla es parte del trabajo del semestre.

### Tests end-to-end (Playwright)

La suite de UI vive en `e2e/` y sigue el [ADR-001](docs/0001-arquitectura-de-testing.md).
Levanta sola su propia API (puerto 3100, base `server/prisma/e2e.db`) y el build
del frontend (puerto 5174), así que no choca con `npm run dev`.

```bash
npm --prefix e2e run install:browsers   # una sola vez: descarga Chromium
npm run test:e2e                        # toda la suite
npm --prefix e2e run test:no-known-bugs # excluye los tests de defectos conocidos
npm --prefix e2e run report             # abre el reporte HTML de la última corrida
```

Los tests etiquetados `@known-bug` fallan a propósito: describen lo que pide la
especificación y la app todavía no cumple. La selección de historias, la
trazabilidad y el detalle de cada defecto están en
[`docs/reporte-tests-e2e.md`](docs/reporte-tests-e2e.md).

## Estructura

```
taskflow/
├── server/
│   ├── prisma/          # esquema, migraciones y datos de ejemplo
│   ├── src/
│   │   ├── middleware/  # autenticación, membresía, manejo de errores
│   │   ├── modules/     # auth, projects, tasks, comments
│   │   └── lib/         # base de datos, validaciones, utilidades
│   └── tests/
├── client/
│   └── src/
│       ├── pages/       # login, proyectos, tablero, detalle, miembros
│       └── lib/         # cliente HTTP, sesión, helpers
└── README.md
```

## Especificación

Los requerimientos completos —las 17 historias de usuario con sus criterios de aceptación y escenarios BDD— están en `taskflow_especificacion_requerimientos.docx`, entregado aparte. **Esa es la fuente de verdad**: cuando el comportamiento del sistema y la especificación no coincidan, la especificación tiene razón.
