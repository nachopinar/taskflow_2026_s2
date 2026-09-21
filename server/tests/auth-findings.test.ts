import request from 'supertest';
import { app } from './helpers';
import { db } from '../src/lib/db';

/**
 * Testing de APIs REST (Módulo: Autenticación)
 *
 * Endpoints explorados: POST /auth/register, POST /auth/login,
 * POST /auth/forgot-password, POST /auth/reset-password.
 *
 * Cada test reproduce un hallazgo real detectado explorando la API y
 * demuestra, contra la especificación (taskflow_especificacion_requerimientos.docx),
 * que el comportamiento actual no cumple el criterio de aceptación citado.
 * Estos tests están escritos en verde-esperado (describen el comportamiento
 * correcto) y hoy fallan contra la implementación.
 */

describe('Hallazgos — Autenticación', () => {
  it('US-01 AC3: el registro acepta una contraseña de 7 caracteres (debería exigir mínimo 8)', async () => {
    // Given: no existe ningún usuario con email 'seven-chars@test.com'
    // When: envío POST /auth/register con password 'Passwo1' (7 caracteres, 1 mayúscula, 1 número)
    // Then (spec US-01 AC3): "La contraseña debe tener mínimo 8 caracteres, al menos
    // 1 número y 1 mayúscula" -> la respuesta debe tener status 400
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'seven-chars@test.com', password: 'Passwo1' });

    expect(res.status).toBe(400);
  });

  it('US-02 AC5: el contador de intentos fallidos no se reinicia tras un login exitoso', async () => {
    const email = 'counter-reset@test.com';

    await request(app).post('/api/auth/register').send({ email, password: 'Password1' });

    // Given: fallé 3 veces seguidas al iniciar sesión
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'Wrong123' });
    }

    // When: inicio sesión correctamente
    const success = await request(app).post('/api/auth/login').send({ email, password: 'Password1' });

    expect(success.status).toBe(200);

    // And: luego fallo 3 veces más
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'Wrong123' });
    }

    // Then (spec US-02 AC5 + escenario BDD "El contador de intentos fallidos se
    // reinicia tras un login exitoso"): mi cuenta sigue sin estar bloqueada, y un
    // login con las credenciales correctas debe devolver 200
    const finalLogin = await request(app).post('/api/auth/login').send({ email, password: 'Password1' });

    expect(finalLogin.status).toBe(200);
  });

  it('US-17 AC2: forgot-password revela si el email existe (debería responder siempre igual)', async () => {
    const email = 'exists@test.com';

    await request(app).post('/api/auth/register').send({ email, password: 'Password1' });

    // Given: existe un usuario con email 'exists@test.com' y no existe ninguno
    // con email 'no-existe-nunca@test.com'
    // When: envío POST /auth/forgot-password con cada uno de esos emails
    const known = await request(app).post('/api/auth/forgot-password').send({ email });

    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-existe-nunca@test.com' });

    // Then (spec US-17 AC2): "La respuesta es idéntica exista o no un usuario con
    // ese email (HTTP 200 y el mismo mensaje genérico)" -> ambas deben ser 200
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
  });

  it('US-17 AC5: un token de reseteo ya usado puede reutilizarse (debería devolver 400)', async () => {
    const email = 'reuse-token@test.com';

    await request(app).post('/api/auth/register').send({ email, password: 'Password1' });

    const { body } = await request(app).post('/api/auth/forgot-password').send({ email });
    const { token } = body as { token: string };

    // Given: ya usé mi token de reseteo para cambiar la contraseña
    const first = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'NewPass1' });

    expect(first.status).toBe(200);

    // When: envío POST /auth/reset-password con el mismo token
    // Then (spec US-17 AC5 + escenario BDD "Un token ya utilizado no se puede
    // reutilizar"): la respuesta debe tener status 400
    const second = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'AnotherPass1' });

    expect(second.status).toBe(400);
  });

  it('US-17 AC4: un token de reseteo vencido (>60 min) sigue siendo aceptado (debería devolver 400)', async () => {
    const email = 'expired-token@test.com';

    await request(app).post('/api/auth/register').send({ email, password: 'Password1' });

    const { body } = await request(app).post('/api/auth/forgot-password').send({ email });
    const { token } = body as { token: string };

    // Given: mi token de reseteo se generó hace 61 minutos
    await db.passwordResetToken.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    // When: envío POST /auth/reset-password con ese token
    // Then (spec US-17 AC4 + escenario BDD "Un token vencido no sirve"):
    // la respuesta debe tener status 400
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'NewPass1' });

    expect(res.status).toBe(400);
  });
});
