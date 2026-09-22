# ADR-001: Arquitectura de testing de TaskFlow

- **Estado:** Aceptado
- **Fecha:** 2026-09-22
- **Alcance:** cómo se organizan los tests de TaskFlow y con qué patrones se escribe el framework de UI

---

## Contexto

TaskFlow es un gestor de tareas colaborativo: backend en Express + Prisma + SQLite, frontend en React 18 con cinco pantallas (login, proyectos, tablero, detalle de tarea y miembros). Cuatro de ellas exigen sesión y comparten el mismo header.

### Qué hay hoy

- **Solo tests de API.** Jest 29 + Supertest contra la app de Express en proceso, en serie, dentro de `server/tests/`.
- **Estructura plana.** Diez archivos de test en una sola carpeta, uno por recurso o preocupación, más un `helpers.ts` con funciones para armar estado (`registerUser`, `createProject`, `createTask`, etc.). Su uso no es obligatorio y varios tests repiten los requests a mano.
- **Dos niveles de profundidad sin regla escrita.** Los tests originales solo miran el status; `characterization.test.ts`, `task-update.test.ts` y `auth-findings.test.ts` también afirman el cuerpo y los casos negativos.
- **Aislamiento por archivo.** `globalSetup.ts` crea una base SQLite de plantilla y `setup.ts` la copia para cada archivo de test.
- **Nada de UI.** No hay Playwright, ni page objects, ni `storageState`, ni configuración de ambientes para la suite. La app sí tiene `data-testid` listos en las piezas principales.
- **Piezas de UI repetidas.** La tarjeta de tarea, la de proyecto, el ítem de comentario, el de miembro y el header se repiten entre columnas, listas o rutas.

El framework de UI tiene que sumarse sin reescribir lo que ya funciona y seguir siendo legible cuando crezcan el equipo y la cantidad de tests.

---

## Decisión

1. **La suite de API se queda como está:** Jest + Supertest en `server/tests/`, estructura plana y helpers actuales.
2. **La UI se testea con Playwright** en una carpeta nueva `e2e/`, organizada **por capa** (configuración, fixtures, page objects, componentes, clientes de API, tests, datos de prueba).
3. **Page Object Model** para las pantallas: una clase por pantalla.
4. **Component Object Model** para las piezas que se repiten (tarjetas, ítems de lista, header), compuestas por los page objects.
5. **Fixtures** (`test.extend()`) para el estado previo: usuario, sesión, proyecto, tarea.
6. **Patrón híbrido:** los datos y la sesión se preparan por API (`APIRequestContext` + `storageState`) y el browser se reserva para lo que la pantalla tiene que demostrar. Solo el test de login pasa por el formulario.
7. **Screenplay no se usa.**

### Por qué

- **Jest se mantiene** porque ya cubre contratos y aísla la base. Migrarlo a Playwright cambia el runner sin sumar capacidad.
- **Por capa, y no plana ni por feature**, porque las pantallas comparten sesión, header y tarjetas. En una estructura plana los locators se duplican. En una por feature, las piezas compartidas no tienen una feature dueña.
- **POM** se ajusta a un proyecto con pocas pantallas y una suite de UI que recién arranca. Por sí solo tiene dos límites conocidos: el setup se repite y los locators de piezas repetidas se copian. **Fixtures** y **componentes** cubren esos dos límites.
- **El patrón híbrido** evita pagar login y alta de datos en el browser cuando eso no es lo que el test prueba.
- **Screenplay** tiene un costo de armado que no se recupera con un equipo chico, cinco pantallas y un semestre.

### Alternativas descartadas

UI en carpeta plana, organización por feature, POM sin fixtures ni componentes, Screenplay, migrar la suite de Jest a `APIRequestContext`, y Cypress, Selenium o WebdriverIO en lugar de Playwright.

---

## Consecuencias

**Positivas**

- Dos suites con responsabilidades claras: `npm test` para la API, Playwright para la UI.
- Cada test de pantalla nuevo tiene un lugar predecible, y un cambio de selector se corrige en una sola clase.
- Como cada test crea sus propios datos, la suite de UI puede correr en paralelo.
- Los tests de UI son más rápidos y estables porque no repiten login ni altas en el browser.

**Negativas / costos**

- Hay una carpeta nueva y una convención que hay que respetar desde el primer test. Si un caso híbrido crea datos por la UI, se rompe la decisión y vuelve el costo.
- Conviven dos runners (Jest y Playwright), y la suite de UI necesita la app levantada y un `.env` propio.
- La suite de API sigue con dos estilos (solo status, o status y cuerpo) hasta que otro ADR los unifique.

**Revisión futura**

- Si `server/tests/` deja de ser navegable, corresponde otro ADR para reorganizarla.
- Screenplay se puede reconsiderar si varios equipos pasan a compartir la misma base de interacciones.
