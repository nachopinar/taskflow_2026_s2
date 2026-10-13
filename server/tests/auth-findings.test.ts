import request from 'supertest';
import { app, registerUser } from './helpers';
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

// Formato de errores de la especificación: código, mensaje y detalle opcional.
const VALIDATION_ERROR = { error: { code: 'VALIDATION_ERROR', message: expect.any(String) } };

function login(email: string, password: string) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function failLogin(email: string, times: number) {
  for (let i = 0; i < times; i += 1) {
    await login(email, 'Wrong123');
  }
}

async function requestResetToken(email: string) {
  const res = await request(app).post('/api/auth/forgot-password').send({ email });
  return (res.body as { token: string }).token;
}

describe('Hallazgos — Autenticación', () => {
  it('US-01 AC3: el registro acepta una contraseña de 7 caracteres (debería exigir mínimo 8)', async () => {
    // Arrange: no existe el usuario y la contraseña tiene 7 caracteres, 1 mayúscula y 1 número
    const credentials = { email: 'seven-chars@test.com', password: 'Passwo1' };

    // Act
    const res = await request(app).post('/api/auth/register').send(credentials);

    // Assert (spec US-01 AC3): "La contraseña debe tener mínimo 8 caracteres, al menos
    // 1 número y 1 mayúscula"
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject(VALIDATION_ERROR);
  });

  it('US-02 AC5: el contador de intentos fallidos no se reinicia tras un login exitoso', async () => {
    // Arrange: fallé 3 veces, inicié sesión correctamente y fallé 3 veces más
    const email = 'counter-reset@test.com';
    const { id } = await registerUser(email);
    await failLogin(email, 3);
    await login(email, 'Password1');
    await failLogin(email, 3);

    // Act
    const res = await login(email, 'Password1');

    // Assert (spec US-02 AC5 + escenario BDD "El contador de intentos fallidos se
    // reinicia tras un login exitoso"): la cuenta no está bloqueada
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ user: { id, email }, token: expect.any(String) });
  });

  it('US-17 AC2: forgot-password revela si el email existe (debería responder siempre igual)', async () => {
    // Arrange: existe 'exists@test.com' y no existe 'no-existe-nunca@test.com'
    const email = 'exists@test.com';
    await registerUser(email);

    // Act
    const known = await request(app).post('/api/auth/forgot-password').send({ email });
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-existe-nunca@test.com' });

    // Assert (spec US-17 AC2): "La respuesta es idéntica exista o no un usuario con
    // ese email (HTTP 200 y el mismo mensaje genérico)"
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
  });

  it('US-17 AC5: un token de reseteo ya usado puede reutilizarse (debería devolver 400)', async () => {
    // Arrange: ya usé mi token de reseteo para cambiar la contraseña
    const email = 'reuse-token@test.com';
    await registerUser(email);
    const token = await requestResetToken(email);
    await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'NewPass1' });

    // Act
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'AnotherPass1' });

    // Assert (spec US-17 AC5 + escenario BDD "Un token ya utilizado no se puede reutilizar")
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject(VALIDATION_ERROR);
  });

  it('US-17 AC4: un token de reseteo vencido (>60 min) sigue siendo aceptado (debería devolver 400)', async () => {
    // Arrange: mi token de reseteo ya venció
    const email = 'expired-token@test.com';
    await registerUser(email);
    const token = await requestResetToken(email);
    await db.passwordResetToken.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    // Act
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'NewPass1' });

    // Assert (spec US-17 AC4 + escenario BDD "Un token vencido no sirve")
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject(VALIDATION_ERROR);
  });
});
