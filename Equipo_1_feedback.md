# Equipo 1 — Calificaciones por equipo, Testing y Calidad de Software 2026

**Repo:** https://github.com/nachopinar/taskflow_2026_s2

Este archivo tiene solo las tareas calificadas por equipo. Las notas individuales (cuestionario de la clase 1, cuestionarios de Moodle y participación) se llevan aparte.

_Escala de las notas: 0-100._

## Tareas por equipo

| Tarea | Clase | Peso | Puntos del curso (máx., de 100) | Nota | Aporta a la final (puntos) | Observaciones |
|---|---|---|---|---|---|---|
| Taller de refinamiento | 2 | 5,3 | 2,65 | pendiente |  | Pendiente de entrega: no figura en el repo. |
| Integration + cobertura + refactor (código pestilente + Ej. 1 de clase 7) | 3 y 7 | 10,6 | 5,30 | 94 | 4,98 | Refactor sólido con tests de caracterización previos y cobertura de ramas de 70 % con umbral en Jest. Falta documentar qué smells detectaron. |
| Postman + Supertest, caza de bugs | 5 | 5,3 | 2,65 | 80 | 2,12 | Supertest completo (patrón AAA, status y cuerpo). Postman no se cuenta. Los reportes de bug no tienen entorno, reproducibilidad, evidencia ni severidad. |
| ADR | 6 | 5,3 | 2,65 | 100 | 2,65 | ADR completo (contexto, decisión, consecuencias y alternativas) y Component Object implementado dentro del framework Playwright. |
| E2E + bugs | 7 y 8 | 10,6 | 5,30 | 64 | 3,39 | Suite rigurosa y verificada contra falsos negativos. US-14 y US-12 no llegan a 3 casos y los bugs D1-D11 están en una tabla de docs/, no como GitHub issues con el formato completo. |
| Performance (k6: tabla seed chica vs grande + issue) | 9 | 5,3 | 2,65 | 100 | 2,65 | Tabla seed chica vs. grande, hipótesis e issue #14 completos, con los criterios de la spec citados. |
| Seguridad + accesibilidad (ZAP, axe-core, CVSS) | 11 | 5,3 | 2,65 | 70 | 1,85 | Buenos hallazgos manuales, axe-core con fix verificado y user stories de remediación. No usaron OWASP ZAP y falta el puntaje CVSS. |
| Pipeline (`ci.yml` y job de E2E) | 12 | 10,6 | 5,30 | 92 | 4,88 | ci.yml con 5 jobs y cache en la rama chore/ci (PR #18 sin mergear). Calificado por la estructura porque los runs fallan por un bloqueo de facturación de GitHub. Falta instalar ESLint y el job de E2E (opcional). |
| Presentación (por definir) | 16 | 15,9 | 7,95 | pendiente |  | Pendiente: todavía no la hicieron. |
| Informe de una página | 12 | 12,8 | 6,40 | pendiente |  | Pendiente de entrega. |
| **Total por equipo** | | **87,0** (53,0 ya calificados) | **43,50** | 85 (promedio ponderado de lo calificado) | **22,52** | Faltan por entregar: Taller de refinamiento, Presentación e Informe de una página. |
| Tareas individuales (Moodle 6, participación 5, cuestionario clase 1 2; pesos provisorios) |  | 13 | 6,50 |  | pendiente | Se llevan aparte, ver `Calificacion_final.md`. |
| **Proyecto final corregido** |  |  | **50,00** | pendiente | pendiente | Vale el 50 % de la nota final. Se califica después de que arreglen lo señalado en estas tareas. |
| **Total del curso** |  |  | **100,00** |  | **22,52** de 100 (hasta ahora; faltan individuales y proyecto final) | 43,50 (equipo) + 6,50 (individuales) + 50,00 (proyecto) |

_Los 13 de peso restantes de las tareas (6,5 puntos del curso: Moodle 6, participación 5, cuestionario clase 1 2) son individuales. Pesos provisorios, pendientes de confirmar._

## Proyecto corregido

| Concepto | Nota | Observaciones |
|---|---|---|
| Nota del proyecto corregido (incluye Rúbrica C de Pact) | | |

## Sugerencias de arreglo para el equipo (2026-11-17)

Notas en escala 0-100. Los "GitHub issues" son los tickets de la pestaña Issues del repo.

### E2E + bugs
- **Bugs como GitHub issues:** D1-D11 están en una tabla de `docs/reporte-tests-e2e.md`, no como GitHub issues, y les faltan entorno, pasos, reproducibilidad, evidencia y severidad. Abrir un GitHub issue por defecto con el mismo molde del issue #14 (título, criterio violado citando la spec, entorno, pasos, esperado/obtenido, reproducibilidad, evidencia, severidad). Recupera hasta unos 28 puntos de la tarea.
- **US-14 y US-12 con menos de 3 casos:** agregar un caso por historia. US-14: asignar a alguien que no es miembro y comprobar que se rechaza. US-12: editar la descripción, recargar y ver que persiste. Hasta 8 puntos cada una.

### Seguridad + accesibilidad
- **Falta OWASP ZAP:** correr un baseline scan contra la app local, exportar el reporte HTML y agregar a `docs/` una tabla que cruce los hallazgos de ZAP con los manuales. Hasta 13 puntos.
- **Falta CVSS:** calcular vector y puntaje (CVSS 3.1, calculadora de first.org/cvss/calculator/3.1) de SEC-01 y SEC-02, y anotarlos en la fila de severidad. Hasta 17 puntos.

### Postman + Supertest
- **Reportes de bug incompletos:** en `docs/reporte-tests-fallidos.md` sumar columnas de entorno, reproducibilidad, evidencia y severidad a los 5 hallazgos. Hasta 20 puntos.

### Pipeline
- **ESLint sin instalar:** `npm --prefix server i -D eslint@9 @eslint/js@9 typescript-eslint@8`, pegar `eslint.config.mjs` en `server/` y commitear `server/package.json`, el lock y el config. 5 puntos.
- **Job de E2E (opcional):** agregar un job con checkout, setup-node con cache, `npm ci`, `npx prisma generate` (en `server`), `npx playwright install --with-deps chromium` (en `e2e`) y `npm run test:e2e`, subiendo el reporte como artefacto. 3 puntos.
- **Runs y PR:** resolver el bloqueo de facturación de la cuenta de GitHub, volver a correr y mergear el PR #18 a `dev`.

### Integration + cobertura + refactor
- **Smells sin documentar:** agregar a `docs/` una tabla "smell, dónde estaba, refactor que lo resolvió, commit". 6 puntos.

### Pendientes de entrega
- Taller de refinamiento, Presentación e Informe de una página.

