# AngeLite · documentation

Documentation of [AngeLite](https://github.com/duvanjamid/angelite): a signals framework with Angular-style templates, small, fast and secure.

**Site:** <https://duvanjamid.github.io/angelite-docs/> in English, and in Spanish at <https://duvanjamid.github.io/angelite-docs/es/> (a switch in the top bar changes language and remembers the choice). Published with GitHub Pages through Actions: `node scripts/build.mjs` generates `dist/`.

*Documentación en español: <https://duvanjamid.github.io/angelite-docs/es/>.*

## What is here

| Folder | Contents |
|---|---|
| `content/en/`, `content/es/` | The pages, one folder per language with the same file names |
| `public/`, `nav.json` | Static files (bundles, styles, scripts, data) and the navigation, with titles in both languages |
| `scripts/strings.mjs` | Every text the generator and the browser scripts write, in both languages |
| `analysis/` | Analysis against other frameworks and the performance guide (English; Spanish copies in `analysis/es/`), the security policy and changelog (synced from the framework, English) and the raw benchmark results |
| `data/` | Types (`data/types`) and the component metadata: `ui-meta.json` (English, from the framework) and `ui-meta.es.json` (the Spanish text, by component id) |
| `scripts/` | `build.mjs` (generator), `check.mjs` (links, anchors, ids, alt), `browser-check.mjs` (Chromium), `sync.mjs` (brings bundles, results and the changelog from a checkout of `angelite`) |
| `legacy/` | Documentation of the old framework, no longer used |

English is the primary language: it lives at the site root and every page has a Spanish counterpart under `/es/`.

## Writing and translating

- A page is `content/<lang>/<id>.html` with a `<!--{"title": …, "description": …}-->` header. Add the English page first, then the Spanish one with the same file name.
- Titles and hints of the navigation are in `nav.json` as `{ "en": …, "es": … }`.
- Texts written by scripts (the component library page, the benchmark, the feature table) are in `scripts/strings.mjs`; `public/ui-examples*.js` and `public/features-data*.js` have one file per language.
- The check (`npm run check`) fails on broken links and anchors in either language.

## How it is updated

The framework lives in its own repository ([`angelite`](https://github.com/duvanjamid/angelite)); three parts of this site are generated from it and the rest is written here:

```bash
# with angelite cloned next to this repository (../angelite)
node scripts/sync.mjs ../angelite     # rebuilds the bundles and brings results, SECURITY and CHANGELOG
git add -A && git commit -m "docs: sync with angelite <commit>"
```

`sync.mjs` runs `npm run build` in the framework (so `public/` uses exactly the published code), copies the three bundles the pages use, turns `benchmarks/results.json` into `public/benchmarks-data.js`, writes `data/ui-meta.json` and copies `SECURITY.md` and `CHANGELOG.md`.

## Development

```bash
npm ci
npm run build   # generates dist/ (English at the root, Spanish in dist/es/)
npm run check   # links, anchors, duplicate ids, images without alt
npx serve dist  # preview
```
