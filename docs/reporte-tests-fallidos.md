# Reporte de tests fallidos por comportamiento incorrecto

- **Fecha:** 2026-10-06 (detección) · 2026-11-17 (re-verificación, entorno y evidencia)
- **Corrida:** `npm run test:coverage` en `server/`: 114 tests, 109 pasan, 5 fallan. La re-verificación del 2026-11-17 (`npx jest --runInBand`) da el mismo resultado.
- **Criterio:** estos tests describen el comportamiento que pide la especificación (`taskflow_especificacion_requerimientos.docx`). Fallan porque la API no lo cumple, así que no se ajustaron. Quedan pendientes de análisis.

Los cinco están en `server/tests/auth-findings.test.ts`.

## Entorno (E1)

Todos los hallazgos se reprodujeron en el mismo entorno:

| Campo | Valor |
|---|---|
| Rama / commit | `fix/postman-supertest`, base `eb8fe38` (igual a `main`, sin cambios en `server/src/`) |
| Sistema operativo | macOS 13 (Darwin 22.6.0) |
| Runtime | Node 22.23.4, npm 10.9.9 |
| Dependencias | Express 4.21.2, Prisma / `@prisma/client` 6.19.3, Jest 29.7.0, ts-jest 29.2.5, Supertest 7.0.0, TypeScript 5.6.3 (`npm ci` sobre el lock) |
| Base de datos | SQLite, una copia por archivo de test (`tests/globalSetup.ts` + `tests/setup.ts`); no usa el seed |
| Cliente | Supertest contra la app Express en memoria (sin levantar `npm run dev`) |
| Comando | `cd server && npx jest --runInBand tests/auth-findings.test.ts` |

## Escala de severidad

| Severidad | Criterio |
|---|---|
| **Alta** | Rompe un control de seguridad de la cuenta (confidencialidad o toma de cuenta). Bloquea la entrega. |
| **Media** | El sistema no cumple una regla de negocio de la spec y afecta al usuario, pero no abre una vía de ataque directa. |
| **Baja** | Desvío menor, cosmético o con workaround trivial. |

## Resumen

| # | Criterio | Request | Esperado (spec) | Recibido | Severidad | Reproducibilidad | Entorno | Evidencia |
|---|----------|---------|-----------------|----------|-----------|------------------|---------|-----------|
| 1 | US-01 AC3 | `POST /api/auth/register` con contraseña `Passwo1` (7 caracteres) | 400 `VALIDATION_ERROR` | 201, el usuario se crea | Media | 3/3 corridas (determinístico) | E1 | [Detalle 1](#1-us-01-ac3--el-registro-acepta-contraseñas-de-7-caracteres) · `auth-findings.test.ts:37` |
| 2 | US-02 AC5 | `POST /api/auth/login` correcto, después de 3 fallos + 1 login exitoso + 3 fallos | 200 con `user` y `token` | 401 `Account temporarily locked` | Media | 3/3 corridas (determinístico) | E1 | [Detalle 2](#2-us-02-ac5--el-contador-de-intentos-fallidos-no-se-reinicia) · `auth-findings.test.ts:50` |
| 3 | US-17 AC2 | `POST /api/auth/forgot-password` con un email que no existe | 200 con el mismo mensaje que para un email existente | 404 `NOT_FOUND` | Alta | 3/3 corridas (determinístico) | E1 | [Detalle 3](#3-us-17-ac2--forgot-password-revela-si-el-email-existe) · `auth-findings.test.ts:67` |
| 4 | US-17 AC5 | `POST /api/auth/reset-password` con un token ya usado | 400 `VALIDATION_ERROR` | 200 | Alta | 3/3 corridas (determinístico) | E1 | [Detalle 4](#4-us-17-ac5--un-token-de-reseteo-se-puede-reutilizar) · `auth-findings.test.ts:85` |
| 5 | US-17 AC4 | `POST /api/auth/reset-password` con un token vencido | 400 `VALIDATION_ERROR` | 200 | Alta | 3/3 corridas (determinístico) | E1 | [Detalle 5](#5-us-17-ac4--un-token-de-reseteo-vencido-se-acepta) · `auth-findings.test.ts:102` |

**Reproducibilidad:** el archivo se corrió 3 veces seguidas el 2026-11-17 y los 5 tests fallaron en las 3 (15/15), con el mismo status recibido. Ninguno depende de tiempos ni de datos compartidos: cada test crea su propio usuario sobre una base vacía.

## Detalle

Cada evidencia tiene dos partes: la salida de Jest del test que falla y los cuerpos de respuesta de un replay de los mismos requests con Supertest (mismo entorno E1, con los mismos emails y contraseñas de los pasos). Los tokens (JWT y de reseteo) se reemplazaron por `<redacted>`.

### 1. US-01 AC3 — el registro acepta contraseñas de 7 caracteres

- **Spec:** "La contraseña debe tener mínimo 8 caracteres, al menos 1 número y 1 mayúscula".
- **Entorno:** E1.
- **Pasos:**
  1. `POST /api/auth/register` con `{ "email": "seven-chars@test.com", "password": "Passwo1" }` (7 caracteres, 1 mayúscula, 1 número).
- **Esperado:** 400 con `{ error: { code: "VALIDATION_ERROR", ... } }`.
- **Obtenido:** 201; el usuario queda creado y se devuelve un token de sesión.
- **Reproducibilidad:** siempre (3/3).
- **Evidencia:**

  ```text
  ● Hallazgos — Autenticación › US-01 AC3: el registro acepta una contraseña de 7 caracteres (debería exigir mínimo 8)
      Expected: 400
      Received: 201

  POST /api/auth/register {"email":"seven-chars@test.com","password":"Passwo1"} => 201
  {"user":{"id":"user-1","email":"seven-chars@test.com","name":null,"createdAt":"2026-11-17T22:20:42.725Z"},"token":"<redacted>"}
  ```

- **Severidad:** Media. Debilita la política de contraseñas (un carácter menos de lo pedido), pero sigue exigiendo número y mayúscula y no permite acceder a cuentas ajenas.
- **Dónde mirar:** `assertPassword` en `server/src/lib/validation.ts` compara `password.length >= 7`, aunque su propio mensaje de error dice "at least 8 characters". La misma función se usa en `reset-password`, así que el defecto también aplica ahí.

### 2. US-02 AC5 — el contador de intentos fallidos no se reinicia

- **Spec:** el contador se reinicia tras un login exitoso.
- **Entorno:** E1.
- **Pasos:**
  1. Registrar `counter-reset@test.com` con `Password1`.
  2. `POST /api/auth/login` 3 veces con contraseña `Wrong123` (401 cada vez).
  3. `POST /api/auth/login` con `Password1` (200).
  4. `POST /api/auth/login` 3 veces más con `Wrong123`.
  5. `POST /api/auth/login` con `Password1`.
- **Esperado:** en el paso 5, 200 con `user` y `token`. Tras el login exitoso del paso 3 el contador vuelve a 0, así que 3 fallos nuevos no alcanzan el umbral de bloqueo (5 fallos).
- **Obtenido:** 401 `Account temporarily locked`. El contador sigue en 3 después del paso 3, así que el 2.º fallo del paso 4 es el 5.º acumulado y bloquea la cuenta (todavía responde `Invalid credentials`). El 3.º fallo y el login correcto del paso 5 ya reciben `Account temporarily locked`, y el usuario legítimo no puede entrar durante 15 minutos.
- **Reproducibilidad:** siempre (3/3).
- **Evidencia:**

  ```text
  ● Hallazgos — Autenticación › US-02 AC5: el contador de intentos fallidos no se reinicia tras un login exitoso
      Expected: 200
      Received: 401

  login ok (paso 3) => 200 {"user":{"id":"user-2","email":"counter-reset@test.com",...},"token":"<redacted>"}
  fallo 1 (paso 4)  => 401 {"error":{"code":"UNAUTHORIZED","message":"Invalid credentials","details":[]}}
  fallo 2 (paso 4)  => 401 {"error":{"code":"UNAUTHORIZED","message":"Invalid credentials","details":[]}}   ← 5.º fallo acumulado: bloquea la cuenta
  fallo 3 (paso 4)  => 401 {"error":{"code":"UNAUTHORIZED","message":"Account temporarily locked. Try again later.","details":[]}}
  login (paso 5)    => 401 {"error":{"code":"UNAUTHORIZED","message":"Account temporarily locked. Try again later.","details":[]}}
  ```

- **Severidad:** Media. Bloquea a usuarios legítimos antes de lo que define la spec (falla de disponibilidad para el usuario), pero no expone datos ni facilita un ataque.
- **Dónde mirar:** `login` en `server/src/modules/auth/auth.service.ts`. En el camino exitoso solo se limpia `lockedUntil`; `failedAttempts` no vuelve a 0, así que los 3 fallos previos se suman a los 3 nuevos y la cuenta se bloquea.

### 3. US-17 AC2 — forgot-password revela si el email existe

- **Spec:** "La respuesta es idéntica exista o no un usuario con ese email (HTTP 200 y el mismo mensaje genérico)".
- **Entorno:** E1.
- **Pasos:**
  1. Registrar `exists@test.com`.
  2. `POST /api/auth/forgot-password` con `{ "email": "exists@test.com" }`.
  3. `POST /api/auth/forgot-password` con `{ "email": "no-existe-nunca@test.com" }`.
- **Esperado:** 200 en los dos pasos, con el mismo `message`.
- **Obtenido:** 200 para el email registrado y 404 `No account found for that email` para el que no existe.
- **Reproducibilidad:** siempre (3/3).
- **Evidencia:**

  ```text
  ● Hallazgos — Autenticación › US-17 AC2: forgot-password revela si el email existe (debería responder siempre igual)
      Expected: 200
      Received: 404

  email registrado    => 200 {"message":"Password reset requested","token":"<redacted>"}
  email no registrado => 404 {"error":{"code":"NOT_FOUND","message":"No account found for that email","details":[]}}
  ```

- **Severidad:** Alta. Permite enumerar qué emails tienen cuenta (OWASP: *account enumeration*), que es el primer paso de ataques de fuerza bruta o phishing dirigido. La spec lo pide explícitamente.
- **Dónde mirar:** `forgotPassword` en `auth.service.ts` lanza `notFound('No account found for that email')`.
- **A tener en cuenta:** hoy la respuesta exitosa incluye el token de reseteo porque no hay servicio de email, así que los cuerpos tampoco pueden ser idénticos. El test compara el status y el campo `message`.

### 4. US-17 AC5 — un token de reseteo se puede reutilizar

- **Spec:** un token ya utilizado no se puede reutilizar.
- **Entorno:** E1.
- **Pasos:**
  1. Registrar `reuse-token@test.com`.
  2. `POST /api/auth/forgot-password` con ese email y guardar el `token` de la respuesta.
  3. `POST /api/auth/reset-password` con `{ token, "newPassword": "NewPass1" }` (200, esperado).
  4. `POST /api/auth/reset-password` con el mismo `token` y `"newPassword": "AnotherPass1"`.
- **Esperado:** en el paso 4, 400 `VALIDATION_ERROR`.
- **Obtenido:** 200 `Password updated`; la contraseña se cambia otra vez.
- **Reproducibilidad:** siempre (3/3).
- **Evidencia:**

  ```text
  ● Hallazgos — Autenticación › US-17 AC5: un token de reseteo ya usado puede reutilizarse (debería devolver 400)
      Expected: 400
      Received: 200

  reset con token (1.ª vez) => 200 {"message":"Password updated"}
  reset con token (2.ª vez) => 200 {"message":"Password updated"}
  ```

- **Severidad:** Alta. Quien obtenga un token ya usado (historial, logs, email reenviado) puede volver a cambiar la contraseña y tomar la cuenta, incluso después de que el dueño la haya recuperado.
- **Dónde mirar:** `resetPassword` en `auth.service.ts` no marca el token como usado (`usedAt`) después de cambiar la contraseña, y `findResetToken` en `auth.repository.ts` no filtra por `usedAt`.

### 5. US-17 AC4 — un token de reseteo vencido se acepta

- **Spec:** el token vence a los 60 minutos.
- **Entorno:** E1.
- **Pasos:**
  1. Registrar `expired-token@test.com`.
  2. `POST /api/auth/forgot-password` con ese email y guardar el `token`.
  3. Dejar el token vencido: el test pone `expiresAt` un minuto en el pasado directamente en la base (equivale a esperar más de 60 minutos).
  4. `POST /api/auth/reset-password` con `{ token, "newPassword": "NewPass1" }`.
- **Esperado:** 400 `VALIDATION_ERROR`.
- **Obtenido:** 200 `Password updated`.
- **Reproducibilidad:** siempre (3/3).
- **Evidencia:**

  ```text
  ● Hallazgos — Autenticación › US-17 AC4: un token de reseteo vencido (>60 min) sigue siendo aceptado (debería devolver 400)
      Expected: 400
      Received: 200

  reset con token vencido => 200 {"message":"Password updated"}
  ```

- **Severidad:** Alta. Anula la ventana de 60 minutos: un token filtrado sirve para siempre (mientras no se pida otro) y permite tomar la cuenta.
- **Dónde mirar:** `resetPassword` y `findResetToken` en `auth.repository.ts`: la consulta busca solo por `token` y no compara `expiresAt` con la hora actual.

## Observaciones que no hacen fallar la suite

- **Nombre de proyecto corto:** `characterization.test.ts` registra que `POST /api/projects` acepta un nombre de 2 caracteres con 201, y lo marca como bug conocido. Ese test pasa porque caracteriza el comportamiento actual; el mensaje de validación del mismo endpoint dice "between 3 and 100 characters".
- **`isOwner` sin uso:** la función de `server/src/middleware/membership.ts` no se llama desde ningún lado de `src/`. Son las únicas líneas del middleware sin cubrir (13-14).
