# AngeLite · documentación

Documentación de [AngeLite](https://github.com/duvanjamid/angelite): un framework de señales con plantillas al estilo de
Angular, pequeño, rápido y seguro.

**Sitio:** <https://duvanjamid.github.io/angelite-docs/> (se publica con GitHub Pages desde `site/`).

## Qué hay aquí

| Carpeta | Contenido |
|---|---|
| `site/` | El sitio estático: portada, **guía con ejemplos que se ejecutan**, **biblioteca de componentes**, **benchmark** y **comparativa de características** frente a Preact, Vue, React y Angular |
| `analysis/` | Análisis frente a los demás frameworks, guía de rendimiento, seguridad, registro de cambios y los resultados en bruto del benchmark (`benchmark-results.json`) |
| `legacy/` | Documentación del framework antiguo (`src/angelite.js`), en desuso |
| `scripts/` | `sync.mjs`: trae los cambios desde un checkout de `angelite` |

## Cómo se actualiza

El código y los bundles viven en el repositorio del framework. Esta documentación se genera a partir de él:

```bash
# en este repo, con angelite clonado al lado (../angelite)
node scripts/sync.mjs ../angelite          # reconstruye los bundles y copia páginas, datos y análisis
git add -A && git commit -m "docs: sync with angelite <commit>"
```

`sync.mjs` ejecuta `npm run build:docs` en `angelite` (para que `site/` use exactamente el código publicado) y copia
`docs/*.html`, `docs/*.js`, `docs/*.md`, `SECURITY.md`, `CHANGELOG.md` y `benchmarks/results.json`. Las páginas de la
raíz (`index.html`, la barra de navegación) son de este repo y no se sobrescriben.

## Ver el sitio en local

```bash
npx http-server site -c-1
```

(abrir `site/*.html` con doble clic también funciona: no hay módulos ES ni peticiones a otros orígenes).

## Qué contiene cada medición

Las cifras del benchmark salen de `analysis/benchmark-results.json`: 5 rondas × 15 iteraciones por operación, arranque con
41 cargas intercaladas, mediana, en Chromium sin cabeza. La regla de lectura es «a menos del 10 % es un empate».
La metodología completa está en la propia página de benchmarks.
