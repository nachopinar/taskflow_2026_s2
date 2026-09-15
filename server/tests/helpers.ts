import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();

export async function registerUser(email: string, password = 'Password1') {
  const res = await request(app).post('/api/auth/register').send({ email, password });
  return { token: res.body.token as string, id: res.body.user.id as string, res };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createProject(token: string, name: string) {
  const res = await request(app).post('/api/projects').set(auth(token)).send({ name });
  return res.body;
}

export async function createTask(token: string, projectId: string, body: Record<string, unknown>) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set(auth(token))
    .send(body);
  return res.body;
}

export async function addMember(ownerToken: string, projectId: string, email: string) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set(auth(ownerToken))
    .send({ email });
  return res.body;
}

export async function setStatus(token: string, taskId: string, status: string) {
  const res = await request(app).patch(`/api/tasks/${taskId}`).set(auth(token)).send({ status });
  return res.body;
}
