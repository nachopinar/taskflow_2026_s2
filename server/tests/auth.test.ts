import request from 'supertest';
import { ISO, apiError, app, registerUser } from './helpers';

describe('Auth', () => {
  it('registra un usuario nuevo', async () => {
    // Arrange
    const credentials = { email: 'ana@test.com', password: 'Password1' };

    // Act
    const res = await request(app).post('/api/auth/register').send(credentials);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: expect.stringMatching(/^user-\d+$/),
        email: 'ana@test.com',
        name: null,
        createdAt: ISO,
      },
      token: expect.any(String),
    });
  });

  it('inicia sesión con credenciales válidas', async () => {
    // Arrange
    const { id } = await registerUser('login@test.com');

    // Act
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Password1' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { id, email: 'login@test.com', name: null, createdAt: ISO },
      token: expect.any(String),
    });
  });

  it('rechaza el login con contraseña incorrecta', async () => {
    // Arrange
    await registerUser('wrong@test.com');

    // Act
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'Otracosa9' });

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Invalid credentials'));
  });
});
