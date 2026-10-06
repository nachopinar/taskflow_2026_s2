import request from 'supertest';
import { ISO, apiError, app, auth, createProject, registerUser } from './helpers';

describe('Proyectos', () => {
  it('crea un proyecto', async () => {
    // Arrange
    const { token, id } = await registerUser('proj1@test.com');

    // Act
    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({ name: 'Mi Proyecto', description: 'Descripción' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^proj-\d+$/),
      name: 'Mi Proyecto',
      description: 'Descripción',
      ownerId: id,
      archived: false,
      createdAt: ISO,
    });
  });

  it('lista los proyectos del usuario', async () => {
    // Arrange
    const { token } = await registerUser('proj2@test.com');
    const projectA = await createProject(token, 'Proyecto A');
    const projectB = await createProject(token, 'Proyecto B');

    // Act
    const res = await request(app).get('/api/projects').set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body).toEqual(expect.arrayContaining([projectA, projectB]));
  });

  it('rechaza crear un proyecto sin autenticación', async () => {
    // Arrange
    const body = { name: 'Sin token' };

    // Act
    const res = await request(app).post('/api/projects').send(body);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body).toEqual(apiError('UNAUTHORIZED', 'Authentication required'));
  });
});
