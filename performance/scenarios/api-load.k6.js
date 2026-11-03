// Prueba de carga del listado de tareas de TaskFlow.
//
// Parámetros (variables de entorno, se pasan con -e):
//   VUS         usuarios virtuales (por defecto 1)
//   DURATION    duración (por defecto 30s)
//   BASE_URL    URL de la API, con prefijo /api (por defecto http://localhost:3000/api)
//   PROJECT_ID  proyecto a medir (por defecto, "[Carga] Proyecto grande" si existe,
//               si no el primero que devuelve el listado)
//
// Ejemplos:
//   k6 run -e VUS=1  -e DURATION=30s performance/scenarios/api-load.k6.js
//   k6 run -e VUS=20 -e DURATION=1m  performance/scenarios/api-load.k6.js
//
// Supuestos sobre la API (confirmados leyendo el código del repo):
//   - Las rutas llevan el prefijo /api (server/src/app.ts).
//   - POST /api/auth/login devuelve el token en "token" (server/src/modules/auth/auth.service.ts).
//   - GET /api/projects devuelve un array plano (server/src/modules/projects/projects.controller.ts).
//   - GET /api/projects/:id/tasks devuelve { items, total, limit, offset }.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const BIG_PROJECT_NAME = '[Carga] Proyecto grande';

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// Corre UNA sola vez: login y elección del proyecto a medir.
// El login no va en cada iteración: la cuenta se bloquea tras varios intentos fallidos.
export function setup() {
  const login = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: 'ana@test.com', password: 'Password1' }),
    { headers: JSON_HEADERS }
  );
  check(login, { 'login 200': (r) => r.status === 200 });

  const body = login.json();
  const token = body.token || body.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  let projectId = __ENV.PROJECT_ID;
  if (!projectId) {
    const res = http.get(`${BASE}/projects`, { headers });
    const list = res.json();
    const big = list.find((p) => p.name && p.name.startsWith(BIG_PROJECT_NAME));
    projectId = big ? big.id : (list.length ? list[0].id : undefined);
  }

  return { headers, url: `${BASE}/projects/${projectId}/tasks` };
}

// Lo que repite cada usuario virtual.
export default function (data) {
  const res = http.get(data.url, { headers: data.headers });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
