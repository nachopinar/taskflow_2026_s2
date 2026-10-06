# Reporte de tests fallidos por comportamiento incorrecto

- **Fecha:** 2026-10-06
- **Corrida:** `npm run test:coverage` en `server/` — 114 tests, 109 pasan, 5 fallan
- **Criterio:** estos tests describen el comportamiento que pide la especificación (`taskflow_especificacion_requerimientos.docx`). Fallan porque la API no lo cumple, así que no se ajustaron. Quedan pendientes de análisis.

Los cinco están en `server/tests/auth-findings.test.ts`.

| # | Criterio | Request | Esperado (spec) | Recibido |
|---|----------|---------|-----------------|----------|
| 1 | US-01 AC3 | `POST /api/auth/register` con contraseña `Passwo1` (7 caracteres) | 400 `VALIDATION_ERROR` | 201, el usuario se crea |
| 2 | US-02 AC5 | `POST /api/auth/login` correcto, después de 3 fallos + 1 login exitoso + 3 fallos | 200 con `user` y `token` | 401 |
| 3 | US-17 AC2 | `POST /api/auth/forgot-password` con un email que no existe | 200 con el mismo mensaje que para un email existente | 404 |
| 4 | US-17 AC5 | `POST /api/auth/reset-password` con un token ya usado | 400 `VALIDATION_ERROR` | 200 |
| 5 | US-17 AC4 | `POST /api/auth/reset-password` con un token vencido | 400 `VALIDATION_ERROR` | 200 |

## Detalle

### 1. US-01 AC3 — el registro acepta contraseñas de 7 caracteres

- **Spec:** "La contraseña debe tener mínimo 8 caracteres, al menos 1 número y 1 mayúscula".
- **Dónde mirar:** `assertPassword` en `server/src/lib/validation.ts`.

### 2. US-02 AC5 — el contador de intentos fallidos no se reinicia

- **Spec:** el contador se reinicia tras un login exitoso.
- **Dónde mirar:** `login` en `server/src/modules/auth/auth.service.ts`. En el camino exitoso solo se limpia `lockedUntil`; `failedAttempts` no vuelve a 0, así que los 3 fallos previos se suman a los 3 nuevos y la cuenta se bloquea.

### 3. US-17 AC2 — forgot-password revela si el email existe

- **Spec:** "La respuesta es idéntica exista o no un usuario con ese email (HTTP 200 y el mismo mensaje genérico)".
- **Dónde mirar:** `forgotPassword` en `auth.service.ts` lanza `notFound('No account found for that email')`.
- **A tener en cuenta:** hoy la respuesta exitosa incluye el token de reseteo porque no hay servicio de email, así que los cuerpos tampoco pueden ser idénticos. El test compara el status y el campo `message`.

### 4. US-17 AC5 — un token de reseteo se puede reutilizar

- **Spec:** un token ya utilizado no se puede reutilizar.
- **Dónde mirar:** `resetPassword` en `auth.service.ts` no marca el token como usado después de cambiar la contraseña.

### 5. US-17 AC4 — un token de reseteo vencido se acepta

- **Spec:** el token vence a los 60 minutos.
- **Dónde mirar:** `resetPassword` y `findResetToken` en `auth.repository.ts`. El test deja `expiresAt` en el pasado y el reseteo igual devuelve 200.

## Observaciones que no hacen fallar la suite

- **Nombre de proyecto corto:** `characterization.test.ts` registra que `POST /api/projects` acepta un nombre de 2 caracteres con 201, y lo marca como bug conocido. Ese test pasa porque caracteriza el comportamiento actual; el mensaje de validación del mismo endpoint dice "between 3 and 100 characters".
- **`isOwner` sin uso:** la función de `server/src/middleware/membership.ts` no se llama desde ningún lado de `src/`. Son las únicas líneas del middleware sin cubrir (13-14).
