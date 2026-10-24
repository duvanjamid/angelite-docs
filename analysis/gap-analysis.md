# AngeLite against React, Preact, Vue and Angular

What they have that we do not, what we have that they do not, and in what order it makes sense to close the gap. The full table is on the [comparison page](comparison.html) (37 rows, with the source of each fact).

## How it was checked

Every claim has a source:

- **V**: verified in this session, by running the code or reading the installed package (React 19.3.1, Preact 10.29.8, Vue 3.5.44, Angular 20.3). The security tests can be repeated with `cd benchmarks && npm install && npm run probe:security`.
- **D**: official documentation.
- **G**: general knowledge that was not checked here. Review it before quoting it.

Of the 37 rows in the table: 16 are V, 2 are D and 19 are G. The security rows are almost all V.

## Summary

1. **Status: the six security gaps we found are closed** (see section 1), with a real test for each one and for its precompiled variant. AngeLite goes from worst to best of the group in the attack tests we run.
2. **Where we win is size, memory and list speed** (see the benchmark). We are also the only one with a small "no build" mode: ~10 KB gzip against Vue's 63.7 KB with its compiler, and with no `eval`.
3. **Where we lose is everything around the core**: types, SSR, router, forms, tooling, community. The table gives us 19.5 out of 38 against 24.5 (Preact), 27 (Vue), 28.5 (React) and 33 (Angular). It is not a ranking, but the gap is real.

## 1. Security

### What we verified each one does

Repeat it with `cd benchmarks && npm install && npm run probe:security`.

| Test | AngeLite (before) | **AngeLite (now)** | Preact | Vue | React | Angular |
|---|---|---|---|---|---|---|
| Escaped text by default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `href` with `javascript:` | let it through | **`unsafe:` + warning** | lets it through | lets it through | neutralizes it | sanitizes it |
| `onclick` as text | created the attribute | **compile error** | does not create it | creates the attribute | does not create it | forbids it |
| HTML in `innerHTML` | unsanitized | **only with `trustHtml()`; otherwise text** | unsanitized | unsanitized | unsanitized | sanitizes |
| Expressions reach `window` | yes, via `$el` | **no, by no path** | n/a (JSX) | no | n/a (JSX) | no |
| Works without `eval` | yes | **yes** | yes | only the runtime-only build | yes | only AOT; JIT uses `new Function` |
| Trusted Types | no | **yes (`angelite` policy)** | no | one reference | no | built in |
| Styles under a strict CSP | `<style>` without nonce | **constructable stylesheets; nonce fallback** | n/a | n/a | n/a | nonce |

Vue and Preact still do not close URLs; only React and Angular do. With these changes AngeLite closes everything they close, plus what nobody else does (a compiler that rejects dangerous bindings, a guard value against `window`).

### How each gap was closed

| # | Gap | Fix | Test |
|---|---|---|---|
| 1 | `[href]` / `href="{{ }}"` accepted `javascript:` | Allow-list of schemes (`http`, `https`, `mailto`, `tel`, `sms`, `ftp`, relative) on `href`, `src`, `action`, `formaction`, `data` and `xlink:href`; ignores the characters browsers drop inside the scheme (`java\tscript:`); everything else becomes `unsafe:<url>` with a warning. `trustUrl()` as the explicit way out. | matrix of 12 dangerous and 13 safe URLs in 7 contexts |
| 2 | `[attr.onclick]` created a handler | Compile error for `[on*]`, `[attr.on*]` and `on*="{{ }}"`, in the browser compiler and in the AOT | 5 variants, also with capitals |
| 3 | Unsanitized `[innerHTML]` | Only rendered when wrapped in `trustHtml()`; any other value is inserted as text and warns | 3 tests |
| 4 | `[srcdoc]` accepted | Compile error (and `[outerHTML]`) | 3 tests |
| 5 | A template reached `window` with `$el.ownerDocument.defaultView.fn()` | Filter **by value**: the global object and documents are never returned to a template, wherever they come from (`$el.ownerDocument`, `$event.view`, `getRootNode()`, `composedPath()[n]`, a component field). DOM methods that turn text into markup or attributes (`insertAdjacentHTML`, `setAttribute`, `write`…) are also blocked by name. | 8 attack paths + events |
| 6 | The UI package injected `<style>` without a nonce | `adoptedStyleSheets` (needs no nonce); if they do not exist, `<style>` with the nonce from `<meta name="csp-nonce">` | 3 tests |

Also: bindings and interpolation in `<script>`, `<style>`, `<base>`, `<link>` and `<meta>` are a compile error; Trusted Types with a single `angelite` policy for templates and `trustHtml()`; `SECURITY.md` with the trust model and how to report; CodeQL with extended queries, Dependabot and `npm audit` in CI.

### What remains (and let us be honest)

- **The expression sandbox is not a security boundary.** A template can still call methods of its component and of the elements it reaches. It is defense in depth: **templates with user data are never compiled** (Vue says the same). In production, precompile with `tools/aot.mjs`: nothing is compiled in the browser.
- **We do not ship an HTML sanitizer.** Angular has one; we require `trustHtml()` and recommend DOMPurify before wrapping. A sanitizer of our own would cost several KB and is easy to get wrong.
- **No external review or track record.** The others have years of audits; we do not.

### What they have that we do not (security)

- **Angular**: a built-in HTML and URL sanitizer per context, years of security review.
- **All of them**: established disclosure processes and a community that finds and fixes flaws.

## 2. Speed and performance

Measured after Wave 1 and Wave 2 (5 rounds × 15 iterations per operation, startup with 41 interleaved loads; shared container, no painting; this machine was ~35 % slower than the previous measurement, so absolute milliseconds are not comparable, positions are). With the rule "within 10 % is a tie":

| | Precompiled AngeLite | Best of the others |
|---|---|---|
| App size (gzip) | **6.1 KB** (the smallest; the new features cost 0.2 KB) | Preact 6.2 KB |
| Startup | 23.1 ms (overlapping interquartile ranges: a technical tie) | Preact 21.3 ms |
| Memory with 10,000 rows | **6.6 MB** | Angular 11.8 MB |
| 12 measurements in all | **lowest median in 7**; within 10 % in 4 (startup, `replace1k`, `swap`, `create10k`); behind in `remove` (Preact, +16 % in this run) | — |

`swap` and `remove` vary from one run to the next: two dedicated repetitions (5 × 15) gave 4.70 ms against Preact's 4.90 in both, and another without the animation hook 4.75 against 4.70. The honest reading is a tie with Preact and Angular. The overall score (geometric mean of the time relative to the best) is 1.03× for precompiled AngeLite; React is at 1.55×. Improvements of this round that were measured: the root host with `display: contents` (−1.5 ms after mount) and a fast path in `@for` when the list keeps the same keys in the same order (`update10th` went from ~9.8 to ~7.9 ms).

What we do **not** have:

| Missing | Who has it | What it would bring |
|---|---|---|
| Compile-time optimizations (hoisted static subtrees, folded constants, per-node flags) | Vue (patch flags + hoisting), React Compiler, Angular AOT | Less work per update; today the AOT precompiles but does not optimize |
| Concurrent rendering and transitions | React | A fluid interface under heavy updates. **We do not recommend copying it**: the complexity is enormous for a lightweight framework |
| SSR and hydration | React, Vue, Angular (including incremental), Preact (separate package) | First paint and SEO. See the architectural advantage below |
| Declarative lazy loading (`@defer`, `lazy`) | All | Code splitting |
| Performance regression detection in CI | — | The benchmark used to be manual: a PR could make speed worse and nobody would see |

Limits of our own worth knowing (verified in the code):

- **One effect per view, not per binding.** A signal that changes re-evaluates every binding in that view (it only writes to the DOM if the value changed). In rows with few bindings that is the cheapest; in a component with hundreds of bindings and a signal that changes many times per second it can cost. Vue and Solid are finer.
- **Immutable lists.** Identity is compared: mutating an array in place and assigning the same one again does not update.
- **Measurement noise.** The numbers come from a shared container with no painting; differences under 10 % are not conclusive.

Ideas to keep improving (in this order): hoist static subtrees in the AOT, flat scope in rows (fewer objects per row), internal properties with shorter names (~0.5 KB), and faster startup (today we tie with Preact at 28 ms).

## 3. Architecture and structure (looking at it as an architect)

Real weak points of the current design:

1. **Module-level global state.** The pipe registry, the `inject()` service map, the router, the set of delegated events and the router hook are singletons. You cannot have two isolated apps on the same page, nor render on the server without mixing requests, nor run tests in parallel with guarantees. *Direction*: an `app` object (`createApp()`) holding registries, injector and router.
2. **Coupling to the global DOM.** The runtime calls `document` directly. That rules out SSR and other renderers. *Direction*: abstract the few DOM operations (create template, insert, move, remove).
3. **Scope by prototype chain and text keys.** Every row creates an object whose prototype is the parent's and expressions look up by name. It is fast and compact, but it cannot be analyzed statically (no types, no template checking) and `$event` / `$index` can collide with user fields.
4. **Events delegated on `document`.** That is what gives the low memory, but it does not work inside Shadow DOM or iframes and `event.currentTarget` is not the element. *Direction*: delegate on the root of each app (not on `document`).
5. **Properties added to elements** (`$s`, `$click`…) can collide with other libraries. *Direction*: a `WeakMap` or a symbol prefix, if measurement allows.
6. **No versioning contract or stable API**, no types and no development mode with warnings. That is what slows adoption most, more than any performance measure.

What they have here that we do not (**Wave 1** closed what is marked ✓; see `CHANGELOG.md`):

- ✓ dependency injection with scopes (`providers`), ✓ router with nested routes, guards and lazy loading, ✓ TypeScript (`.d.ts` checked with `tsc`), ✓ error boundaries (`ngOnError`; they do not catch the constructor or `ngOnInit`), ✓ portals, ✓ named slots, ✓ child references (`viewChild`), ✓ testing utilities, ✓ development warnings, ◐ template checking (elements, pipes and names; not types).
- **Wave 2** added, as optional modules: reactive forms, an HTTP client with interceptors and `resource()`, i18n, enter and leave animations, SSR with `hydrate()`, basic DevTools, `history` mode with query and resolvers, a Vite plugin and `angelite-check`. Each one is smaller and has fewer features than Angular's (the table says so).
- Still missing: hydration that adopts the server's nodes, a language service for the editor (autocompletion), a browser DevTools extension, async validators, `createApp()`, concurrent rendering (decision: no), and maturity / community (only fixed with time and users).

Where the others have it matters: almost none of this ships in the core of React, Preact or Vue (router, forms, HTTP, i18n, animations and testing are separate packages, official or third party). What Vue, React and Angular do ship inside is the structural part (portals, error boundaries, lazy loading, slots, DI), which is exactly what we closed in the package itself. The table on the comparison page marks for each row whether it is built in, an optional module, an official package or a third party.

### An architectural advantage we do have

The **blueprint is data**: the AOT already serializes the list of instructions per node position. That makes **SSR and hydration a natural step**: render to text by evaluating the instructions without a DOM, and on the client walk the existing DOM with the same instructions (numbering by position already exists). Few frameworks have that base; we should take advantage of it before adding more features.

## 4. What we have and they do not (or not as much)

All verified:

- **A small "no build" mode**: 10.1 KB gzip with the compiler included, against 63.7 KB for Vue's build with a compiler. Angular has no usable equivalent (its JIT compiler is large and uses `new Function`).
- **No `eval` or `new Function` in any bundle**, also in the no-build mode. Vue's build with a compiler and Angular's JIT do use them, and require `unsafe-eval` in the CSP.
- **Zero runtime dependencies** (Vue: 5, Angular: `tslib` plus peers, React: `scheduler`).
- **Memory**: 6.4 MB with 10,000 rows against 11.8 – 17.8 MB.
- **The same code in two modes** (browser and precompiled) with a template compiler with a swappable backend.
- **Angular syntax (`@if`, `@for`, signals) without Zone.js or a CLI.**
- **Blocking of `constructor`, `__proto__` and `prototype`** in expressions.

We have to be honest about the real weight of this: almost all of it is advantages in size, memory and simplicity. In features, ecosystem and maturity we are far behind.

## 5. Proposed roadmap

Effort: S = hours, M = days, L = weeks.

**P0, security and trust (S–M):**

1. Sanitize URLs in bindings and interpolated attributes (gap 1). *S*
2. Reject `on*` and `srcdoc` (gaps 2 and 4). *S*
3. `[innerHTML]` only with `trustHtml()` (gap 3). *S*
4. Denylist of globals in the evaluator and documentation about untrusted templates (gap 5). *S*
5. `SECURITY.md`. *S*
6. `adoptedStyleSheets` in the UI package (gap 6). *S*
7. Optional Trusted Types policy for the browser compiler. *M*

**P1, make it adoptable (M)** (✓ = done in Wave 1):

8. ✓ `.d.ts` types, written by hand and checked with `tsc` in CI.
9. ✓ Development mode with warnings (`enableDevWarnings()`: unknown input, duplicate keys, unknown element, module not imported) and ✓ per-component error hook (`ngOnError`). A global hook is missing.
10. Router: ✓ nested routes, ✓ guards, ✓ lazy loading and ✓ `redirectTo`; resolvers, query parameters and `history` mode came later.
11. ✓ Reactive forms on signals (Wave 2).
12. ✓ Testing utilities (`render`, `click`, `type`, `flush`, `cleanup`).
13. ✓ Named slots, ✓ references (`viewChild`) and ✓ portals.
14. `createApp()` with per-app registries and injector (fixes the global state). *Wave 3*

**P2, platform and performance (L):**

15. ◐ SSR with jsdom and `hydrate()` that replaces the HTML (Wave 2). Pending: render blueprints without a DOM and adopt the nodes.
16. ✓ `@defer` (triggers `idle`, `viewport`, `interaction`, `hover`, `timer`, `immediate`, `when`) and lazy routes. Automatic splitting of a single component's code is missing.
17. AOT optimizations: hoisted static subtrees, flat scope, folded constants.
18. ✓ Hook for DevTools and a minimal panel (`enableDevtools`).
19. ✓ Performance budget in CI with deterministic metrics (number of DOM operations per scenario), not times.
20. ✓ Remove the old code (done in 1.0.0).

**P3, on demand:** ✓ transitions and animations (basic), ✓ i18n, virtual scroll, ✓ Vite plugin, a language service for the editor.

**What not to copy:** Zone.js; deep reactivity through proxies (slower and more memory); full concurrent rendering. (The HTTP client was finally built, but as a module of ~1.3 KB on top of `fetch`, not like Angular's.)
