import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { Project, Task } from '@client/types';
import type { NewTask } from '../src/api/types';
import { GUEST } from '../src/fixtures/session';
import { expect, test } from '../src/fixtures/test';
import type { BoardPage } from '../src/pages/BoardPage';
import type { LoginPage } from '../src/pages/LoginPage';
import type { ProjectsPage } from '../src/pages/ProjectsPage';
import type { TaskDetailPage } from '../src/pages/TaskDetailPage';

/**
 * Auditoría de accesibilidad WCAG 2.1 AA — Clase 12, Módulo 2.
 * Adaptación del a11y.spec.ts del curso a este repo: usa los fixtures y page
 * objects de e2e/ (ADR-001) en lugar de los usuarios del seed y el login por UI.
 * Suma la vista Detalle de tarea: es la única donde axe encuentra violaciones.
 *
 *   1. Informe, desde e2e/: npx playwright test a11y --project=chromium
 *   2. Corregir una violación en client/src/.
 *   3. Poner su id en VERIFICAR.regla y volver a correr: pasa de rojo a verde.
 */

const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const VERIFICAR: { regla: string | null; vistas: string[] } = {
  regla: 'label',
  vistas: ['Detalle de tarea'],
};

interface Contexto {
  loginPage: LoginPage;
  projectsPage: ProjectsPage;
  boardPage: BoardPage;
  taskDetailPage: TaskDetailPage;
  project: Project;
  createTask: (task: NewTask) => Promise<Task>;
}

const VISTAS: { nombre: string; publica: boolean; abrir: (ctx: Contexto) => Promise<void> }[] = [
  {
    nombre: 'Login',
    publica: true,
    abrir: ({ loginPage }) => loginPage.goto(),
  },
  {
    nombre: 'Registro',
    publica: true,
    abrir: async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.modeToggle.click();
      await expect(loginPage.nameInput).toBeVisible();
    },
  },
  {
    nombre: 'Proyectos',
    publica: false,
    abrir: async ({ projectsPage }) => {
      await projectsPage.goto();
      await expect(projectsPage.cards.first()).toBeVisible();
    },
  },
  {
    nombre: 'Detalle de proyecto',
    publica: false,
    abrir: async ({ boardPage, project, createTask }) => {
      await createTask({ title: 'Tarea para auditar' });
      await boardPage.goto(project.id);
      await expect(boardPage.cards.first()).toBeVisible();
    },
  },
  {
    nombre: 'Detalle de tarea',
    publica: false,
    abrir: async ({ taskDetailPage, createTask }) => {
      const task = await createTask({ title: 'Tarea para auditar' });
      await taskDetailPage.goto(task);
    },
  },
];

/** 'wcag143' -> '1.4.3' ; 'wcag2410' -> '2.4.10' */
function tagASc(tag: string): string | null {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

function nivel(tags: string[]): string {
  return tags.some((t) => t.endsWith('aa')) ? 'AA' : 'A';
}

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();
  return violations;
}

// El informe no falla: sirve para leer y documentar los hallazgos.
test.describe('Informe de accesibilidad WCAG 2.1 AA', () => {
  for (const vista of VISTAS) {
    test.describe(vista.nombre, () => {
      if (vista.publica) test.use({ storageState: GUEST });

      test('informe de violaciones', async (
        { page, loginPage, projectsPage, boardPage, taskDetailPage, project, createTask },
        testInfo,
      ) => {
        await vista.abrir({ loginPage, projectsPage, boardPage, taskDetailPage, project, createTask });
        const violations = await auditar(page);

        console.log(`\n=== ${vista.nombre}: ${violations.length} regla(s) violada(s) ===`);
        for (const v of violations) {
          const sc = v.tags.map(tagASc).filter(Boolean).join(', ');
          console.log(`\n[${(v.impact ?? 'n/a').toUpperCase()}] ${v.id} — ${v.help}`);
          console.log(`   SC WCAG: ${sc || 'n/a'}  ·  Nivel ${nivel(v.tags)}`);
          console.log(`   Elementos afectados: ${v.nodes.length}`);
          v.nodes.slice(0, 3).forEach((n) => console.log(`   · ${n.target.join(' ')}`));
          console.log(`   Más info: ${v.helpUrl}`);
        }

        await testInfo.attach(`axe-${vista.nombre}.json`, {
          body: JSON.stringify(violations, null, 2),
          contentType: 'application/json',
        });
      });
    });
  }
});

// Verificación de la corrección: pasa de rojo a verde cuando la corrección funciona.
test.describe('Verificación de la corrección', () => {
  test.skip(!VERIFICAR.regla, 'Definí VERIFICAR.regla con el id de la regla que corregiste');

  for (const vista of VISTAS.filter((v) => VERIFICAR.vistas.includes(v.nombre))) {
    test.describe(vista.nombre, () => {
      if (vista.publica) test.use({ storageState: GUEST });

      test(`ya no hay violaciones de "${VERIFICAR.regla}"`, async ({
        page,
        loginPage,
        projectsPage,
        boardPage,
        taskDetailPage,
        project,
        createTask,
      }) => {
        await vista.abrir({ loginPage, projectsPage, boardPage, taskDetailPage, project, createTask });
        const ids = (await auditar(page)).map((v) => v.id);
        expect(ids).not.toContain(VERIFICAR.regla);
      });
    });
  }
});
