// Seed de carga para la clase de performance (k6).
//
// Genera:
//   - 1 proyecto grande "[Carga] Proyecto grande" con 5.000 tareas y ~20.000 comentarios
//   - 199 proyectos chicos "[Carga] Proyecto N" sin tareas, para que el listado de
//     proyectos tenga volumen pero toda la carga de tareas quede concentrada en uno solo
//
// Reutiliza los usuarios creados por seed.ts (ana/bob/caro). No inventa usuarios nuevos
// ni depende de paquetes externos (sin faker): los datos variados salen de arrays fijos
// combinados con el índice de la tarea.
//
// Es re-ejecutable: al empezar borra cualquier dato de carga anterior, identificado por
// el prefijo "[Carga]" en el nombre del proyecto. El borrado de Project NO hace cascada
// hacia comments/task_history en este schema (comments.taskId y task_history.taskId no
// tienen FK declarada), así que se borra a mano y en orden: comments, tasks,
// project_members, projects.

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const LOAD_PREFIX = '[Carga]';
const BIG_PROJECT_NAME = '[Carga] Proyecto grande';
const SMALL_PROJECT_COUNT = 199;
const TOTAL_TASKS = 5000;
const COMMENTS_PER_TASK = 4; // 5000 * 4 = 20000 comentarios en total

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TOPICS = ['Backend', 'Frontend', 'Infra', 'QA', 'Diseño', 'Datos', 'Seguridad', 'Mobile'];
const COMMENT_BODIES = [
  'Arranco con esto.',
  'Queda pendiente de revisión.',
  'Avanza sin problemas por ahora.',
  'Hay que coordinar con el otro equipo.',
  'Listo, pasa a la siguiente etapa.',
];

// Margen de seguridad por debajo del límite histórico de SQLite (999 variables
// por consulta). Cada INSERT por lotes se calcula para no superarlo.
const SQLITE_SAFE_VARS = 900;

function batchSizeFor(fieldsPerRow: number): number {
  return Math.max(1, Math.min(500, Math.floor(SQLITE_SAFE_VARS / fieldsPerRow)));
}

async function insertInBatches<T>(
  rows: T[],
  fieldsPerRow: number,
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  const size = batchSizeFor(fieldsPerRow);
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size));
  }
}

async function deleteByIdInBatches(
  ids: number[],
  del: (batch: number[]) => Promise<unknown>,
): Promise<void> {
  const size = 500;
  for (let i = 0; i < ids.length; i += size) {
    await del(ids.slice(i, i + size));
  }
}

async function cleanupPreviousLoad(): Promise<void> {
  const loadProjects = await db.project.findMany({
    where: { name: { startsWith: LOAD_PREFIX } },
    select: { id: true },
  });
  const loadProjectIds = loadProjects.map((p) => p.id);
  if (loadProjectIds.length === 0) return;

  const loadTasks = await db.task.findMany({
    where: { projectId: { in: loadProjectIds } },
    select: { id: true },
  });
  const loadTaskIds = loadTasks.map((t) => t.id);

  // 1) comments (sin FK a tasks: hay que borrarlos a mano por taskId)
  await deleteByIdInBatches(loadTaskIds, (batch) =>
    db.comment.deleteMany({ where: { taskId: { in: batch } } }),
  );

  // 2) tasks
  await deleteByIdInBatches(loadProjectIds, (batch) =>
    db.task.deleteMany({ where: { projectId: { in: batch } } }),
  );

  // 3) memberships
  await deleteByIdInBatches(loadProjectIds, (batch) =>
    db.projectMember.deleteMany({ where: { projectId: { in: batch } } }),
  );

  // 4) projects
  await deleteByIdInBatches(loadProjectIds, (batch) =>
    db.project.deleteMany({ where: { id: { in: batch } } }),
  );
}

async function main() {
  const requiredEmails = ['ana@test.com', 'bob@test.com', 'caro@test.com'];
  const users = await db.user.findMany({ where: { email: { in: requiredEmails } } });
  const byEmail = new Map(users.map((u) => [u.email, u]));
  const missing = requiredEmails.filter((e) => !byEmail.has(e));
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `Faltan usuarios base (${missing.join(', ')}). Corré primero: npm --prefix server run db:seed`,
    );
    process.exit(1);
  }
  const ana = byEmail.get('ana@test.com')!;
  const bob = byEmail.get('bob@test.com')!;
  const caro = byEmail.get('caro@test.com')!;
  const assignees = [ana, bob, caro];

  await cleanupPreviousLoad();

  // --- Proyectos ---
  const bigProject = await db.project.create({
    data: {
      name: BIG_PROJECT_NAME,
      description: 'Proyecto de carga con miles de tareas para medir performance con k6.',
      ownerId: ana.id,
    },
  });

  const smallProjectRows = Array.from({ length: SMALL_PROJECT_COUNT }, (_, i) => ({
    name: `${LOAD_PREFIX} Proyecto ${i + 1}`,
    description: 'Proyecto de carga sin tareas (relleno para el listado de proyectos).',
    ownerId: ana.id,
  }));
  await insertInBatches(smallProjectRows, 3, (batch) => db.project.createMany({ data: batch }));

  const smallProjects = await db.project.findMany({
    where: {
      name: { startsWith: `${LOAD_PREFIX} Proyecto ` },
      NOT: { name: BIG_PROJECT_NAME },
    },
    select: { id: true },
  });

  // --- Membresías ---
  // ana es owner de todos los proyectos de carga (grande + chicos).
  const membershipRows = [
    { projectId: bigProject.id, userId: ana.id, role: 'OWNER' },
    { projectId: bigProject.id, userId: bob.id, role: 'MEMBER' },
    { projectId: bigProject.id, userId: caro.id, role: 'MEMBER' },
    ...smallProjects.map((p) => ({ projectId: p.id, userId: ana.id, role: 'OWNER' })),
  ];
  await insertInBatches(membershipRows, 3, (batch) =>
    db.projectMember.createMany({ data: batch }),
  );

  // --- Tareas del proyecto grande ---
  const taskRows = Array.from({ length: TOTAL_TASKS }, (_, i) => {
    const assignee = assignees[i % 4] ?? null; // 1 de cada 4 queda sin asignar
    return {
      projectId: bigProject.id,
      title: `${TOPICS[i % TOPICS.length]} - tarea de carga #${i + 1}`,
      description: `Tarea generada por seed-large para pruebas de performance (#${i + 1}).`,
      status: STATUSES[i % STATUSES.length],
      priority: PRIORITIES[i % PRIORITIES.length],
      assigneeId: assignee ? assignee.id : null,
    };
  });
  await insertInBatches(taskRows, 6, (batch) => db.task.createMany({ data: batch }));

  const createdTasks = await db.task.findMany({
    where: { projectId: bigProject.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  // --- Comentarios: 4 por tarea = 20.000 en total ---
  const commentRows: { taskId: number; authorId: number; body: string }[] = [];
  createdTasks.forEach((task, taskIndex) => {
    for (let c = 0; c < COMMENTS_PER_TASK; c += 1) {
      const author = assignees[(taskIndex + c) % assignees.length];
      const body = COMMENT_BODIES[(taskIndex + c) % COMMENT_BODIES.length];
      commentRows.push({ taskId: task.id, authorId: author.id, body });
    }
  });
  await insertInBatches(commentRows, 3, (batch) => db.comment.createMany({ data: batch }));

  const [projectCount, taskCount, commentCount] = await Promise.all([
    db.project.count({ where: { name: { startsWith: LOAD_PREFIX } } }),
    db.task.count({ where: { projectId: bigProject.id } }),
    db.comment.count({ where: { taskId: { in: createdTasks.map((t) => t.id) } } }),
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `Seed grande listo: ${projectCount} proyectos de carga, ${taskCount} tareas y ${commentCount} comentarios en el proyecto grande.`,
  );
  // eslint-disable-next-line no-console
  console.log(`Proyecto grande -> id: ${bigProject.id}, nombre: "${bigProject.name}"`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
