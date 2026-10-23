# AngeLite · documentación

Documentación de [AngeLite](https://github.com/duvanjamid/angelite): un framework de señales con plantillas al estilo de
Angular, pequeño, rápido y seguro.

**Sitio:** <https://duvanjamid.github.io/angelite-docs/> (se publica con GitHub Pages con Actions: `node scripts/build.mjs` genera `dist/`).

## Qué hay aquí

| Carpeta | Contenido |
|---|---|
| `content/`, `public/`, `nav.json` | Fuente del sitio (el generador `scripts/build.mjs` produce `dist/`): portada, **guía con ejemplos que se ejecutan**, **biblioteca de componentes**, **benchmark** y **comparativa de características** frente a Preact, Vue, React y Angular |
| `analysis/` | Análisis frente a los demás frameworks, guía de rendimiento, seguridad, registro de cambios y los resultados en bruto del benchmark (`benchmark-results.json`) |
| `legacy/` | Documentación del framework antiguo (`src/angelite.js`), en desuso |
| `scripts/` | `build.mjs` (generador), `check.mjs` (enlaces, anclas, ids, alt), `browser-check.mjs` (Chromium), `sync.mjs`: trae bundles, resultados y registro de cambios desde un checkout de `angelite` |

## Cómo se actualiza

El framework vive en su propio repositorio ([`angelite`](https://github.com/duvanjamid/angelite)); esta documentación
tiene tres partes que se generan a partir de él y el resto se escribe aquí:

```bash
# con angelite clonado al lado (../angelite)
node scripts/sync.mjs ../angelite     # reconstruye los bundles y trae resultados, SECURITY y CHANGELOG
git add -A && git commit -m "docs: sync with angelite <commit>"
```

`sync.mjs` ejecuta `npm run build` en el framework (para que `public/` use exactamente el código publicado), copia los tres
bundles que usan las páginas, convierte `benchmarks/results.json` en `public/benchmarks-data.js` y copia `SECURITY.md` y
`CHANGELOG.md`. Las páginas, la tabla de características (`public/features-data.js`) y los textos de `analysis/` se editan
en este repositorio.

## Ver el sitio en local

```bash
npx http-server site -c-1
```

(abrir `site/*.html` con doble clic también funciona: no hay módulos ES ni peticiones a otros orígenes).

## Qué contiene cada medición

Las cifras del benchmark salen de `analysis/benchmark-results.json`: 5 rondas × 15 iteraciones por operación, arranque con
41 cargas intercaladas, mediana, en Chromium sin cabeza. La regla de lectura es «a menos del 10 % es un empate».
La metodología completa está en la propia página de benchmarks.

## Estado

Sincronizada con `duvanjamid/angelite` en el commit `3451b6e` (PR #3 integrado en `main`: ola 1 y 2, seguridad, rendimiento).

## Desarrollo

```bash
npm ci
npm run build   # genera dist/
npm run check   # enlaces, anclas, ids duplicados, imágenes sin alt
```
