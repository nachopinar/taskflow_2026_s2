// Estados del proveedor: los mismos textos los implementa server/tests/pact/tasks.pact.test.ts
export const BASE = 'ana es miembro de proj-1 y el proyecto tiene tareas';
export const WITH_COMMENTS = 'la tarea task-1 tiene comentarios';
// Las interacciones que modifican una tarea usan una nueva, para no depender del orden
export const FRESH_TASK = 'ana es miembro de proj-1 y existe una tarea por hacer';
export const TASK_WITH_TAG = 'existe una tarea con la etiqueta frontend';

// Ids de ejemplo; en la verificación el proveedor los reemplaza con fromProviderState
export const FRESH_TASK_ID = 'task-2';
export const TAG_ID = 'tag-1';
