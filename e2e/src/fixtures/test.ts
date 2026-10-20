import { test as base, Page } from '@playwright/test';
import type { Project, Task } from '@client/types';
import { TaskflowApi } from '../api/TaskflowApi';
import type { Account, NewTask } from '../api/types';
import { env } from '../config/env';
import { uniqueEmail, uniqueName } from '../data/factories';
import { BoardPage } from '../pages/BoardPage';
import { LoginPage } from '../pages/LoginPage';
import { MembersPage } from '../pages/MembersPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TaskDetailPage } from '../pages/TaskDetailPage';
import { sessionFor } from './session';

interface Fixtures {
  /** Cliente de la API sin sesión. Con `.as(cuenta)` actúa en nombre de un usuario. */
  api: TaskflowApi;
  /** Registra una cuenta nueva por API; `alias` solo sirve para leer mejor el email. */
  createAccount: (alias?: string) => Promise<Account>;
  /** Usuario principal del test. El `page` arranca con su sesión iniciada. */
  owner: Account;
  /** Cliente de la API autenticado como `owner`. */
  ownerApi: TaskflowApi;
  /** Proyecto del `owner`, creado por API. */
  project: Project;
  /** Usuario que ya es miembro (no owner) de `project`. */
  member: Account;
  /** Crea una tarea en `project` en nombre del `owner`. */
  createTask: (task: NewTask) => Promise<Task>;
  /** Abre otra ventana con la sesión de `account`, para escenarios con dos usuarios. */
  openPageAs: (account: Account) => Promise<Page>;
  loginPage: LoginPage;
  projectsPage: ProjectsPage;
  boardPage: BoardPage;
  taskDetailPage: TaskDetailPage;
  membersPage: MembersPage;
}

export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: env.apiURL });
    await use(new TaskflowApi(request));
    await request.dispose();
  },

  createAccount: async ({ api }, use) => {
    await use((alias = 'user') => api.register(uniqueEmail(alias)));
  },

  owner: async ({ createAccount }, use) => {
    await use(await createAccount('owner'));
  },

  ownerApi: async ({ api, owner }, use) => {
    await use(api.as(owner));
  },

  project: async ({ ownerApi }, use) => {
    await use(await ownerApi.createProject(uniqueName('Proyecto')));
  },

  member: async ({ ownerApi, project, createAccount }, use) => {
    const member = await createAccount('miembro');
    await ownerApi.addMember(project.id, member.user.email);
    await use(member);
  },

  createTask: async ({ ownerApi, project }, use) => {
    await use((task) => ownerApi.createTask(project.id, task));
  },

  // Patrón híbrido: la sesión se inyecta, no se tipea. Los specs de login y
  // registro la anulan con `test.use({ storageState: GUEST })`.
  storageState: async ({ owner }, use) => {
    await use(sessionFor(owner));
  },

  openPageAs: async ({ browser }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (account) => {
      const context = await browser.newContext({
        baseURL: env.webURL,
        timezoneId: env.timezone,
        storageState: sessionFor(account),
      });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((c) => c.close()));
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  projectsPage: async ({ page }, use) => use(new ProjectsPage(page)),
  boardPage: async ({ page }, use) => use(new BoardPage(page)),
  taskDetailPage: async ({ page }, use) => use(new TaskDetailPage(page)),
  membersPage: async ({ page }, use) => use(new MembersPage(page)),
});

export { expect } from '@playwright/test';
