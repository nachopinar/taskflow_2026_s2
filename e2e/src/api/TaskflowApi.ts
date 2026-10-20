import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import type { Comment, Project, Task } from '@client/types';
import { VALID_PASSWORD, uniqueEmail } from '../data/factories';
import type { Account, NewTask, TaskUpdate } from './types';

/**
 * Cliente de la API para preparar el estado de los tests (patrón híbrido del ADR-001).
 * Cada llamada exige una respuesta exitosa: si el arrange falla, el test se corta
 * ahí con el error de la API en lugar de fallar más adelante por un motivo confuso.
 */
export class TaskflowApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  /** Devuelve un cliente que actúa en nombre de `account`. */
  as(account: Account): TaskflowApi {
    return new TaskflowApi(this.request, account.token);
  }

  async register(email = uniqueEmail(), password = VALID_PASSWORD): Promise<Account> {
    const body = await this.call<Pick<Account, 'user' | 'token'>>(
      'post',
      '/api/auth/register',
      { email, password },
    );
    return { user: body.user, token: body.token, password };
  }

  /** Intento de login cuyo resultado se inspecciona en el test (puede fallar a propósito). */
  attemptLogin(email: string, password: string): Promise<APIResponse> {
    return this.request.post('/api/auth/login', { data: { email, password } });
  }

  createProject(name: string, description?: string): Promise<Project> {
    return this.call('post', '/api/projects', { name, description });
  }

  listProjects(): Promise<Project[]> {
    return this.call('get', '/api/projects');
  }

  async addMember(projectId: string, email: string): Promise<void> {
    await this.call('post', `/api/projects/${projectId}/members`, { email });
  }

  createTask(projectId: string, task: NewTask): Promise<Task> {
    return this.call('post', `/api/projects/${projectId}/tasks`, task);
  }

  updateTask(taskId: string, changes: TaskUpdate): Promise<Task> {
    return this.call('patch', `/api/tasks/${taskId}`, changes);
  }

  getTask(taskId: string): Promise<Task> {
    return this.call('get', `/api/tasks/${taskId}`);
  }

  async addTag(taskId: string, name: string): Promise<void> {
    await this.call('post', `/api/tasks/${taskId}/tags`, { name });
  }

  addComment(taskId: string, body: string): Promise<Comment> {
    return this.call('post', `/api/tasks/${taskId}/comments`, { body });
  }

  private async call<T>(
    method: 'get' | 'post' | 'patch',
    url: string,
    data?: unknown,
  ): Promise<T> {
    const headers = this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
    const res = await this.request[method](url, { data, headers });
    expect(res.ok(), `${method.toUpperCase()} ${url} → ${res.status()} ${await res.text()}`).toBe(
      true,
    );
    return (await res.json()) as T;
  }
}
