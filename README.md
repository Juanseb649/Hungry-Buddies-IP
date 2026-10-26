# Hungry Buddies

Un duelo de comida entre dos amigos: cada uno elige lo que se va a comer,
después confirma lo que de verdad se comió, y gana la pila de platos más alta.

App web local-first (sin cuentas ni backend), instalable como PWA y pensada
para desplegarse en Vercel.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de dominio y persistencia (Vitest)
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ (útil para probar el modo offline)
npm run icons      # regenera los íconos PWA desde public/icon.svg
```

## Despliegue en Vercel

1. Importa el repositorio en Vercel. Detecta Vite solo: build `npm run build`,
   salida `dist/`.
2. `vercel.json` redirige todas las rutas a `index.html` para que recargar
   `/match/:id/result` no dé 404.
3. Cada push a la rama de producción despliega; cada rama o PR tiene su propia
   URL de vista previa.

## Arquitectura

Hexagonal, organizada por funcionalidad. El dominio no importa React, Dexie
ni APIs del navegador.

```text
src/
  app/                       router, layout y container (composición de dependencias)
  features/
    matches/
      domain/                entidades, reglas, puntuación, puertos y casos de uso
      application/hooks/     useMatch: conecta la UI con los casos de uso
      data/dexie/            adaptadores de repositorio sobre IndexedDB
      presentation/          páginas: inicio, jugadores, selección, confirmación, resultado
    food-catalog/            catálogo, validación y su repositorio Dexie
    history/                 estadísticas e historial
    settings/                catálogo editable, almacenamiento y respaldo
  shared/
    database/                esquema Dexie (versionado), semilla y respaldo JSON
    theme/                   tokens de diseño y estilos
    components/              stepper, diálogos, barra inferior
```

Rutas: `/`, `/match/new`, `/match/:id/select`, `/match/:id/confirm`,
`/match/:id/result`, `/history`, `/settings`.

La dirección visual está en [docs/DESIGN.md](docs/DESIGN.md).

## Datos

Todo vive en IndexedDB, en el navegador donde se jugó. Borrar los datos del
sitio, usar una ventana privada o cambiar de dispositivo deja el historial
atrás. En **Ajustes** se puede descargar y restaurar un respaldo JSON, y pedir
almacenamiento persistente al navegador.
