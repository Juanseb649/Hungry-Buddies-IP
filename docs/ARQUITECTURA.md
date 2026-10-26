# Hungry Buddies IP

## Documento de arquitectura, flujo y stack tecnológico

**Versión:** 2.1\
**Plataforma objetivo:** aplicación web (navegadores de escritorio y
móvil), instalable como PWA\
**Despliegue:** Vercel (sitio estático)\
**Enfoque:** aplicación local-first, sin registro de usuarios ni backend
en la primera versión.

> **Cambio respecto a la v1.0:** la app deja de ser nativa (React Native
> + Expo para Android/iOS) y pasa a ser una aplicación web. Se reemplaza
> Expo SQLite por IndexedDB (vía Dexie.js), Expo por Vite, y la
> distribución por APK/TestFlight por un despliegue en Vercel. El
> dominio, los casos de uso y la arquitectura hexagonal no cambian.
>
> **Cambio en la v2.1:** se quita la fase de "plan contra lo que de verdad
> se comió". Ahora la partida empieza eligiendo un **menú guardado** en
> Ajustes y cada jugador lleva un **contador en vivo** de lo que se come.
> Se añaden **perfiles** editables, un menú de navegación tipo
> hamburguesa, una pantalla de bienvenida y transiciones animadas.

## 1. Propósito

Hungry Buddies IP es una aplicación web informal para que dos personas
compitan comiendo: eligen un menú, cada una cuenta en vivo lo que se va
comiendo y gana quien sume más puntos. La app muestra puntuaciones, resultados e historial de
partidas. La primera versión funciona sin conexión (una vez cargada) y
guarda los datos en el navegador del dispositivo.

## 2. Alcance de la primera versión

-   No requiere *sign in*, cuentas ni perfiles remotos.
-   Se abre desde una URL pública en Vercel; se puede "instalar" en la
    pantalla de inicio del teléfono como PWA.
-   Permite iniciar una partida local con dos jugadores, usando nombres
    o apodos; cada persona tiene un perfil con avatar y estadísticas.
-   En Ajustes se guardan menús con nombre (por ejemplo "Noche
    mexicana"), armados con comidas del catálogo.
-   Cada partida usa un menú y un contador en vivo: cada jugador suma una
    porción cada vez que se come algo del menú.
-   Calcula una puntuación y muestra el resultado de la partida.
-   Guarda las partidas anteriores, estadísticas y récords localmente en
    el navegador (IndexedDB).
-   No tiene backend ni sincronización entre dispositivos: los datos
    viven en el navegador donde se crearon.
-   Las funciones principales no necesitan internet después de la
    primera carga (service worker).

### Regla de puntuación

Para evitar comparaciones injustas entre alimentos distintos, se
recomienda asignar puntos configurables por porción. Ejemplo: una
hamburguesa = 3 puntos y una porción de papas = 1 punto. La app compara
puntos, no afirma medir nutrición ni calorías. En una futura versión, la
regla podría cambiarse por peso o porciones normalizadas.

## 3. Flujo principal de usuario

1.  **Bienvenida:** al abrir la app, una pantalla corta con el logo.
2.  **Menú (¿qué se van a comer?):** se elige uno de los menús guardados
    en Ajustes.
3.  **Jugadores:** se escriben los dos nombres o se eligen perfiles que ya
    jugaron.
4.  **Contador en vivo:** una salpicadura de condimento abre la partida.
    Cada fila es una comida del menú y cada jugador toca su lado cuando se
    come una porción (con botón para deshacer). Un reloj muestra cuánto va
    durando la partida.
5.  **Resultado:** al terminar, la salpicadura toma el color del ganador;
    se muestran las pilas de platos, lo que más comió cada uno y la
    revancha con el mismo menú.
6.  **Historial y perfiles:** partidas anteriores, récords y la página de
    cada persona (estadísticas, comida favorita, editar nombre y avatar).
7.  **Ajustes:** menús, catálogo y puntos por porción, almacenamiento y
    respaldo.

Un menú hamburguesa permite ir a Inicio, Nueva partida, Historial,
Perfiles (con acceso directo a cada persona) y Ajustes. Las rutas son
`/`, `/match/new`, `/match/:id/play`, `/match/:id/result`, `/history`,
`/profiles`, `/profiles/:id`, `/settings` y `/settings/menus/:id`;
recargar o usar "atrás" no pierde el contexto.

## 4. Arquitectura hexagonal

Se mantiene una arquitectura hexagonal (Ports and Adapters), organizada
por funcionalidades. El objetivo es que las reglas de negocio sean
independientes de la interfaz y de IndexedDB, de modo que sea posible
añadir sincronización, una API o un cliente nativo en el futuro sin
reescribir el dominio.

### 4.1 Capas y responsabilidades

**Dominio (núcleo)** - Entidades: `Player`, `FoodItem`, `FoodSelection`,
`Match`, `MatchResult`. - Reglas: calcular puntos, validar cantidades,
cerrar una partida, determinar empate o ganador. - Casos de uso:
`CreateMatch`, `AddFoodSelection`, `UpdateConsumedQuantity`,
`CalculateMatchResult`, `GetMatchHistory`. - TypeScript puro: no importa
React, Dexie ni APIs del navegador.

**Puertos (interfaces)** - `MatchRepository`: guardar y consultar
partidas. - `FoodCatalogRepository`: consultar y mantener el catálogo. -
Opcional a futuro: `SyncRepository` o `RemoteMatchService`. - Se definen
en el dominio o en la aplicación, según el diseño elegido.

**Adaptadores de salida** - `DexieMatchRepository`: implementa el puerto
de partidas sobre IndexedDB. - `DexieFoodCatalogRepository`: persiste el
catálogo. - `InMemory*Repository`: implementaciones en memoria para
pruebas. - Adaptadores futuros: API remota, exportación/importación de
datos o sincronización.

**Adaptadores de entrada** - Páginas, componentes y rutas web (React +
React Router). - Hooks/controladores que reciben eventos de la UI y
ejecutan casos de uso. - No contienen reglas centrales de puntuación.

### 4.2 Dirección de dependencias

La dirección de dependencias va hacia el núcleo: la UI llama a casos de
uso; los casos de uso dependen de interfaces; los adaptadores
implementan esas interfaces. El dominio nunca importa Dexie ni
componentes de interfaz.

``` text
         Web UI (React)
     (routes, pages, components)
                 |
            Hooks / controllers
                 |
             Use cases
                 |
       Domain entities + rules
                 |
          Repository ports
                 ^
                 |
     Dexie repository adapter
                 |
         IndexedDB (navegador)
```

El diagrama es conceptual: los casos de uso usan interfaces de
repositorio y el adaptador Dexie las implementa. En ejecución, la
aplicación conecta ambas partes en un único punto de composición (por
ejemplo `src/app/container.ts`) y las expone a la UI mediante un React
Context.

### 4.3 Estructura sugerida del proyecto

``` text
public/                   # íconos, manifest de PWA
src/
  app/                    # rutas, layout, composición (container)
  features/
    matches/
      domain/
        entities/
        ports/
        use-cases/
      application/
        hooks/
      data/
        dexie/
        repositories/
      presentation/
        pages/
        components/
    food-catalog/
      domain/
      application/
      data/
      presentation/
    history/
      domain/
      application/
      data/
      presentation/
  shared/
    database/             # instancia Dexie, versiones de esquema, seed
    theme/
    components/
    utils/
vercel.json
vite.config.ts
```

Para un proyecto pequeño se puede empezar con menos carpetas, pero
manteniendo las dependencias y responsabilidades separadas. Evitar crear
interfaces y casos de uso sin una necesidad real.

## 5. Stack tecnológico recomendado

### Cliente web

-   **Vite:** herramienta de build y servidor de desarrollo; genera un
    sitio estático que Vercel sirve sin configuración de servidor.
-   **React:** librería de interfaz.
-   **TypeScript:** lenguaje con tipos estáticos.
-   **React Router:** navegación por rutas en el cliente (SPA).
-   **Dexie.js sobre IndexedDB:** base de datos local persistente en el
    navegador, con transacciones, índices y versiones de esquema.
-   **vite-plugin-pwa (Workbox):** manifest y service worker para que la
    app funcione offline y se pueda instalar en la pantalla de inicio.
-   **React hooks o Zustand:** estado de interfaz; empezar con hooks y
    añadir Zustand solo si el estado compartido lo justifica.
-   **Tailwind CSS o CSS Modules:** estilos; diseño *mobile-first*
    porque el uso principal será en el teléfono.
-   **Vitest + React Testing Library:** pruebas de dominio e interfaz;
    `fake-indexeddb` para probar los adaptadores Dexie.
-   **Git + GitHub:** control de versiones y disparador de despliegues en
    Vercel.

### ¿Por qué no Next.js ni SQLite?

-   **Next.js** también se despliega muy bien en Vercel, pero su valor
    principal (renderizado en servidor, API routes) no se usa en una app
    sin backend cuyos datos solo existen en el navegador. Vite produce
    un sitio estático más simple. Si en el futuro se añade backend,
    migrar a Next.js o añadir funciones serverless de Vercel es viable
    sin tocar el dominio.
-   **SQLite en el navegador** es posible (SQLite WASM + OPFS), pero
    añade complejidad (headers COOP/COEP, workers, soporte desigual).
    IndexedDB es nativo en todos los navegadores y Dexie ofrece una API
    cómoda. Gracias a los puertos, cambiar de motor después solo afecta
    al adaptador.

### Despliegue en Vercel

-   Conectar el repositorio de GitHub a un proyecto de Vercel; Vercel
    detecta Vite automáticamente (`npm run build`, salida `dist/`).
-   Cada push a `main` despliega a producción; cada rama o PR genera un
    *preview deployment* con su propia URL para probar cambios.
-   Como es una SPA con rutas en el cliente, añadir un `vercel.json`
    para que cualquier ruta sirva `index.html`:

``` json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

-   HTTPS viene incluido (requisito para service workers y PWA).
-   El plan Hobby (gratuito) está pensado para uso personal y no
    comercial, lo cual encaja con una app informal. Si el proyecto se
    vuelve comercial, revisar el plan Pro.
-   Dominio propio opcional desde el panel de Vercel.
-   No se necesitan variables de entorno ni base de datos de Vercel en
    esta versión.

### Alternativa

Si más adelante se quieren apps nativas en tiendas, una opción es Expo
con `react-native-web` (una base de código para web, Android e iOS). Por
ahora se elige React + Vite por ser lo más directo para una app solo
web. Gracias a la arquitectura hexagonal, el dominio y los casos de uso
se podrían reutilizar en un cliente nativo.

## 6. Modelo de datos local inicial

Almacenes (*object stores*) de IndexedDB definidos con Dexie:

-   `players`: `id`, `display_name`, `name_key` (único), `avatar`,
    `created_at`, `last_played_at`.
-   `foods`: `id`, `name`, `emoji`, `points_per_portion`, `is_custom`.
-   `menus`: `id`, `name`, `emoji`, `food_ids`.
-   `matches`: `id`, `started_at`, `finished_at`, `status`
    (`playing` o `finished`) y `menu`, una copia del menú con los puntos
    de cada comida al empezar; índice por `started_at` para el historial.
-   `match_players`: `match_id`, `player_id` y nombre guardado como
    snapshot.
-   `food_selections`: `id`, `match_id`, `slot`, `food_id`,
    `consumed_quantity`, `points_per_portion_snapshot`; índice por
    `match_id`.

Ejemplo de definición:

``` ts
db.version(1).stores({
  players: 'id, display_name',
  foods: 'id, name',
  matches: 'id, started_at, status',
  match_players: '[match_id+player_id], match_id',
  food_selections: 'id, match_id, [match_id+player_id]',
});
```

Guardar una copia del valor de puntos usado en cada selección evita que
editar el catálogo cambie retroactivamente los resultados de partidas
antiguas. IndexedDB no tiene claves foráneas ni restricciones `CHECK`:
la integridad (cantidades positivas, referencias válidas, partidas
cerradas inmutables) se valida en el dominio y los casos de uso. Los
cambios de esquema se hacen con versiones de Dexie
(`db.version(n).stores(...).upgrade(...)`), que funcionan como
migraciones. Usar IDs generados en el cliente (`crypto.randomUUID()`)
para facilitar una futura sincronización.

## 7. Consideraciones de escalabilidad

La arquitectura facilita: - Cambiar IndexedDB por otra fuente de datos
manteniendo los casos de uso. - Añadir una API (por ejemplo funciones
serverless en Vercel con una base de datos gestionada) y sincronización
si se decide compartir partidas entre dos teléfonos. - Añadir
autenticación en el futuro sin hacer que el dominio dependa del
proveedor de identidad. - Añadir nuevos métodos de puntuación, logros,
retos y estadísticas. - Probar las reglas del juego sin iniciar la
interfaz ni la base de datos.

La arquitectura hexagonal no proporciona sincronización por sí sola. Al
ser web, compartir una partida entre dos teléfonos es una petición
natural (ambos abren la misma URL), pero sin backend cada navegador
tiene sus propios datos. Habilitarlo requiere diseñar identidad, API o
sincronización, resolución de conflictos, seguridad y recuperación de
datos.

## 8. Requisitos no funcionales

-   Las funciones principales deben operar offline después de la primera
    visita (service worker con precache de la app).
-   Diseño responsive y *mobile-first*; usable con una mano en un
    teléfono.
-   La escritura de una partida y sus selecciones debe usar
    transacciones de Dexie (`db.transaction('rw', ...)`).
-   Validar que las cantidades sean positivas y que una partida cerrada
    no cambie accidentalmente.
-   Versionar el esquema de Dexie para cada cambio de estructura.
-   Añadir pruebas unitarias para el cálculo de puntos y determinación
    de ganador.
-   No guardar contraseñas ni datos sensibles: no existen cuentas en
    esta versión.
-   **Persistencia en el navegador:** los datos se pierden si el usuario
    borra los datos del sitio, usa modo incógnito o cambia de navegador
    o dispositivo. Safari (iOS/macOS) puede borrar el almacenamiento de
    sitios no usados en varios días si no están instalados en la
    pantalla de inicio. Mitigaciones:
    -   Solicitar almacenamiento persistente con
        `navigator.storage.persist()`.
    -   Recomendar instalar la PWA en la pantalla de inicio.
    -   Ofrecer **exportar/importar** el historial como archivo JSON
        (requisito de la v1 web, no opcional).
    -   Mostrar un aviso claro de que los datos viven solo en ese
        navegador.
-   Accesibilidad básica: contraste suficiente, botones grandes,
    etiquetas en formularios.

## 9. Plan de implementación

1.  Crear el proyecto con Vite (plantilla React + TypeScript), subirlo a
    GitHub y conectarlo a Vercel para tener una URL desde el primer día.
2.  Diseñar el modelo de dominio y escribir pruebas de puntuación con
    Vitest.
3.  Definir los puertos de repositorio y los casos de uso, con
    repositorios en memoria para pruebas.
4.  Configurar Dexie: esquema inicial, versiones y catálogo semilla.
5.  Implementar adaptadores Dexie y pruebas de persistencia con
    `fake-indexeddb`.
6.  Construir páginas y rutas: Inicio, Menú, Jugadores, Contador,
    Resultado, Historial, Perfiles y Ajustes.
7.  Conectar la UI a casos de uso mediante hooks y el contenedor de
    dependencias.
8.  Añadir `vite-plugin-pwa`: manifest, íconos y service worker; añadir
    `vercel.json` con el rewrite de la SPA.
9.  Implementar exportación/importación JSON y la solicitud de
    almacenamiento persistente.
10. Probar en Chrome Android y Safari iOS: modo avión, recarga, cerrar y
    reabrir, instalación en pantalla de inicio y actualización de
    versión del esquema.
11. Desplegar a producción en Vercel y documentar cómo respaldar el
    historial.

## 10. Criterios de aceptación

-   Se puede crear una partida sin iniciar sesión, desde la URL de
    Vercel.
-   Dos jugadores pueden seleccionar alimentos y cantidades.
-   Se puede corregir el consumo real antes de cerrar la partida.
-   El resultado se calcula de forma consistente y se puede probar
    unitariamente.
-   Al cerrar la pestaña y volver a abrir la app en el mismo navegador,
    las partidas guardadas siguen disponibles.
-   Recargar cualquier ruta directamente (por ejemplo
    `/match/abc/result`) no devuelve 404.
-   Después de la primera visita, las funciones principales funcionan
    sin internet.
-   La app se puede instalar en la pantalla de inicio en Android e iOS.
-   El historial se puede exportar e importar como archivo.
-   La lógica de puntuación no depende de componentes de UI ni de
    IndexedDB/Dexie.

## 11. Documentación oficial

-   Vite: https://vite.dev/guide/
-   React: https://react.dev/
-   React Router: https://reactrouter.com/
-   Dexie.js: https://dexie.org/docs/
-   IndexedDB (MDN):
    https://developer.mozilla.org/docs/Web/API/IndexedDB_API
-   Storage API / persistencia (MDN):
    https://developer.mozilla.org/docs/Web/API/Storage_API
-   Vite PWA: https://vite-pwa-org.netlify.app/
-   Vitest: https://vitest.dev/
-   Vercel + Vite: https://vercel.com/docs/frameworks/frontend/vite
-   Vercel rewrites: https://vercel.com/docs/project-configuration

------------------------------------------------------------------------

**Decisión propuesta:** React + Vite + TypeScript + Dexie (IndexedDB) +
PWA, desplegada como sitio estático en Vercel, con arquitectura
hexagonal pragmática y funcionamiento local-first. Sin backend, sin
inicio de sesión, con exportación/importación de datos y posibilidad de
añadir adaptadores remotos (por ejemplo funciones serverless en Vercel)
en una versión futura.
