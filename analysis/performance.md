# Performance: how to add features without hurting it

The goal is that **every new feature arrives without making the core slower, bigger or hungrier for memory**. There are four layers of control, from the cheapest to the most expensive, and a few design rules.

## The four layers

| Layer | What it measures | Where it runs | Noise |
|---|---|---|---|
| 1. Size | Gzip bytes of every bundle (`npm run size`) and of **what is really shipped** to a user: the table app built with esbuild (`npm run size:apps`) | CI, on every PR | none |
| 2. Work | DOM calls and effect runs per scenario (1,000 rows): `tests/perf-budget.test.mjs` against `tests/perf-budget.json` | CI (`npm test`), on every PR | none: it is deterministic |
| 3. Relative time | AngeLite against Preact **in the same run** (`npm run perf`, workflow `perf.yml`); the ratio is compared with `benchmarks/baseline.json`: a single operation fails if it gets worse by more than 35 %, or the geometric mean of all of them if it gets worse by more than 10 % | on demand, weekly and on PRs that touch the core; it does not block | medium (a single operation varies up to ~30 %; the mean, far less) |
| 4. Full benchmark | The five frameworks, 12 measurements, memory and startup (`benchmarks/run.mjs`) | by hand, before publishing; updates the benchmark page | high: read it with the 10 % rule |

Why this way: time on a shared runner varies 10–20 % from one run to the next, so it is no use for blocking a PR over a few points. What is exact is **how much work the core does**: if a feature adds one DOM call per row or one more evaluation per operation, layer 2 sees it even if the time does not move. Size is exact too. Relative time (layer 3) catches what the others miss (for example, a new property access in a hot loop) and layer 4 is the one that gets published.

### Layer 2 in detail

`tests/perf-budget.test.mjs` mounts the table app with **every optional module loaded** (portal, `@defer`, animations…) and counts, per scenario, the calls to `createElement`, `cloneNode`, `appendChild`, `insertBefore`, `remove`, `after`, `before`, `setAttribute`, `classList.toggle`, `data =`, `textContent =`, `addEventListener`… and the `Effect.run` executions. It also checks that the browser compiler and the precompiled template do **exactly** the same work. Today (1,000 rows):

| Scenario | DOM calls | Effects |
|---|---|---|
| create 1,000 | 5,002 | 1,001 |
| replace 1,000 | 5,004 | 1,001 |
| update every 10th | 100 | 101 |
| select a row | 1 | 1,000 |
| swap 2 rows | 2 | 1 |
| remove a row | 1 | 1 |
| append 1,000 | 5,000 | 1,001 |
| clear | 4 | 1 |

If a change raises any figure, the test fails and says which. If it is on purpose, explain it in the PR and run `UPDATE_PERF=1 npm test`, which rewrites the budget in the same commit. If a figure **drops**, the test says so, so the improvement gets locked in (the budget should only move with a written reason).

## Design rules for new features

1. **Optional module by default.** A feature that not every app uses goes in its own file and hooks in through the `ops` registry (template instructions such as `portal`, `defer`, `anim`) or through a module that is only imported when used (`forms`, `http`, `i18n`). That way an app that does not import it does not pay for it, in bytes or in time. That is what happened with the 14 features of waves 1 and 2.
2. **Do not touch the hot paths without measuring.** They are `instantiate`, `runView`, `ForState.reconcile` and `removeView`. A new property on every row or every node, or an extra call per binding, gets multiplied by thousands. If it is truly needed, layers 2 and 3 must show it is not noticeable.
3. **Pay per component or per template, not per row.** Work that can be done once at compile time (the AOT does it in the build) or once when a component is created is almost free; work done per row is not.
4. **Mind the shape of objects.** Adding fields to `View`, to the context or to elements changes their shape and can slow down everything that touches them. Optional fields are created only when used (this is how DI providers were done: the map is created on the first `inject`).
5. **Development warnings do not go in the core.** `enableDevWarnings()` installs them by wrapping `A.prop`, `A.state` and `ops` from the outside; the production build does not include a single byte of them.
6. **Every byte of the core is debated.** The budgets are in `scripts/check-size.mjs` and `scripts/check-app-size.mjs` and only go up in the commit that explains why.

## What each core feature costs today

Measured on the precompiled table app (gzip): before wave 1, 5,968 B; today, 6,223 B (+255 B, **+4 %**).

| Piece | Approx. | Why it is in the core |
|---|---|---|
| Component context + `reportError` (error boundaries) | ~110 B | errors, scoped DI and slots share it |
| The `ops` registry and its dispatch | ~55 B | lets portals, `@defer`, refs and animations weigh nothing if unused |
| Named slots | ~40 B | changes how content is projected |
| `detach` (animated exit) and `host.$c` (DevTools) | ~28 B | minimal hook for two optional modules |

Everything else (portals, `@defer`, refs, forms, HTTP, i18n, animations, DevTools, SSR, testing) does not show up in that app: they are 0.1–1.4 KB each, only for whoever imports them.

## How to measure

```bash
npm test                 # includes the work budget (layer 2)
npm run size && npm run size:apps       # layer 1
npm run perf             # layer 3: builds and measures AngeLite and Preact, compares with benchmarks/baseline.json (about 5 minutes)
cd benchmarks && node build.mjs && node run.mjs      # layer 4, by hand
```

Updating the layer 3 reference point is done on purpose, after a full clean run: `node benchmarks/compare.mjs --update benchmarks/results.json`.

## Pending performance improvements, with data

Ordered by what the work budget already shows:

- **Selecting a row runs 1,000 effects.** Every row reads `selected()` and is re-evaluated entirely to change a class on two rows. It costs ~1.3 ms (tied with Preact and Angular), but it is the best candidate: per-binding effects only for those that read signals external to the row.
- **`remove`/`swap` hover around a tie with Preact** (4.5–5.2 ms depending on the run). A profile with Chromium's tracing mode is missing, to separate noise from real cost before touching anything.
- **`create1k`: 5 DOM calls per row.** `cloneNode`, `append`, two `data =` (the text holes) and an initial `classList.toggle` that changes nothing. The last two can be skipped (start the texts with their value in the template and do not toggle a class to `false`).
- **Startup:** 22–25 ms against Preact's 21 on this machine. The ceiling is script parsing; reducing core bytes is the only thing that moves it.
