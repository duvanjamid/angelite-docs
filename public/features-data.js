// Comparison data for comparison.html (English; features-data.es.js is the Spanish version). Evidence: V = verified by running/reading packages, D = official docs, G = general knowledge (verify before quoting).
window.FEATURES = {
 "legend": {
  "y": "Yes / built in",
  "p": "Partial, limited or a separate package",
  "n": "No"
 },
 "evidence": {
  "V": "Verified in this session: by running the code or reading the installed package",
  "D": "According to the official documentation",
  "G": "General knowledge, not verified in this session"
 },
 "frameworks": [
  [
   "angelite",
   "AngeLite"
  ],
  [
   "preact",
   "Preact"
  ],
  [
   "vue",
   "Vue"
  ],
  [
   "react",
   "React"
  ],
  [
   "angular",
   "Angular"
  ]
 ],
 "versions": "React 19.3.1, Preact 10.29.8, Vue 3.5.44, Angular 20.3",
 "groups": [
  {
   "title": "Security",
   "rows": [
    {
     "name": "Escaped text by default",
     "why": "Interpolating user data as text must never run HTML.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       ""
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "escaped by design"
      ]
     }
    },
    {
     "name": "Neutralizes `javascript:` URLs in attributes",
     "why": "An `href` with user data is the most common XSS in frameworks.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "allow-list of schemes; `trustUrl()` for your own schemes"
      ],
      "preact": [
       "n",
       "lets them through"
      ],
      "vue": [
       "n",
       "lets them through"
      ],
      "react": [
       "y",
       "replaces them with a throw"
      ],
      "angular": [
       "y",
       "sanitizes them (`unsafe:`)"
      ]
     }
    },
    {
     "name": "Does not run `on*` handlers passed as text",
     "why": "An `onclick` with a string is arbitrary code execution.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "compile error (also in the AOT)"
      ],
      "preact": [
       "y",
       "does not create it"
      ],
      "vue": [
       "n",
       ":onclick with text creates the attribute"
      ],
      "react": [
       "y",
       "does not create it"
      ],
      "angular": [
       "y",
       "forbids it in the compiler"
      ]
     }
    },
    {
     "name": "Rejects dangerous bindings at compile time",
     "why": "`[onclick]`, `[srcdoc]`, or binding data to `<script>`: better an error at build time than a hole in production.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "on*, srcdoc, outerHTML and bindings on script/style/base/link/meta: compile error (verified)"
      ],
      "preact": [
       "p",
       "there are no templates; onClick with text is ignored (verified)"
      ],
      "vue": [
       "n",
       ":onclick with text creates the attribute (verified)"
      ],
      "react": [
       "p",
       "onClick with text is ignored (verified)"
      ],
      "angular": [
       "y",
       "refuses to bind to event properties (according to its documentation)"
      ]
     }
    },
    {
     "name": "HTML only with explicit trust (or sanitized)",
     "why": "Inserting user HTML unchecked is XSS: the safe thing is that it does not render unless you mark it.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "`trustHtml()` is required; without it the value is inserted as text"
      ],
      "preact": [
       "p",
       "renders it if you pass it (dangerouslySetInnerHTML)"
      ],
      "vue": [
       "p",
       "renders it if you pass it (v-html)"
      ],
      "react": [
       "p",
       "renders it if you pass it (dangerouslySetInnerHTML)"
      ],
      "angular": [
       "y",
       "DomSanitizer sanitizes strings (according to its documentation)"
      ]
     }
    },
    {
     "name": "Expressions with no access to `window`/`document`",
     "why": "If someone controls a template, it should not reach the whole browser.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "blocked by value: window and document reach the template by no path"
      ],
      "preact": [
       "y",
       "JSX is code, there are no expressions in strings"
      ],
      "vue": [
       "y",
       "only allowed globals (window and document are undefined)"
      ],
      "react": [
       "y",
       "JSX is code, there are no expressions in strings"
      ],
      "angular": [
       "y",
       "expressions only see the component"
      ]
     }
    },
    {
     "name": "Works with a CSP without `unsafe-eval` (no-build mode)",
     "why": "Strict policies forbid `eval` and `new Function`.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "no eval or new Function in any bundle"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "p",
       "the build with the compiler uses new Function; the runtime-only one does not"
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "p",
       "AOT yes; the JIT compiler uses new Function"
      ]
     }
    },
    {
     "name": "Trusted Types support",
     "why": "Required by some enterprise security policies.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "`angelite` policy for templates and `trustHtml()`"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "p",
       "a reference in runtime-dom"
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       "built into the sanitizer"
      ]
     }
    },
    {
     "name": "CSP for injected styles (nonce)",
     "why": "If the framework injects `<style>`, a strict CSP blocks it.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "constructable stylesheets; otherwise <style> with a nonce"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "ngCspNonce"
      ]
     }
    },
    {
     "name": "Runtime dependencies",
     "why": "Fewer dependencies = less supply-chain surface.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "0"
      ],
      "preact": [
       "y",
       "0"
      ],
      "vue": [
       "p",
       "5 (@vue/*)"
      ],
      "react": [
       "y",
       "1 (scheduler)"
      ],
      "angular": [
       "p",
       "tslib + peers (rxjs…)"
      ]
     }
    },
    {
     "name": "Security policy and reporting process",
     "why": "Knowing how to report vulnerabilities and how they get fixed.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "SECURITY.md with the trust model"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    }
   ]
  },
  {
   "title": "Speed and performance",
   "rows": [
    {
     "name": "Fine-grained updates (signals)",
     "why": "Only what depends on the changed data is touched.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       ""
      ],
      "preact": [
       "p",
       "with @preact/signals, a separate package"
      ],
      "vue": [
       "y",
       "reactivity through proxies"
      ],
      "react": [
       "n",
       "re-renders; the Compiler mitigates it"
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Minimal list reordering",
     "why": "Move only the needed nodes when reordering.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "longest increasing subsequence"
      ],
      "preact": [
       "p",
       "diff with keys"
      ],
      "vue": [
       "y",
       "longest increasing subsequence"
      ],
      "react": [
       "p",
       "diff with keys"
      ],
      "angular": [
       "y",
       "@for with track"
      ]
     }
    },
    {
     "name": "Event delegation",
     "why": "One listener instead of one per element: less memory.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "on document"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "y",
       "on the root"
      ],
      "angular": [
       "n",
       ""
      ]
     }
    },
    {
     "name": "Build-time optimization (hoisting, flags, auto-memo)",
     "why": "The compiler does work the runtime does not have to repeat.",
     "ev": "G",
     "cells": {
      "angelite": [
       "p",
       "AOT precompiles, without hoisting or flags"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "y",
       "patch flags and static hoisting"
      ],
      "react": [
       "y",
       "React Compiler"
      ],
      "angular": [
       "y",
       "strict AOT"
      ]
     },
     "where": {
      "angelite": "mod",
      "vue": "off",
      "react": "off",
      "angular": "off"
     }
    },
    {
     "name": "Concurrent rendering / transitions",
     "why": "Keeping the interface fluid during heavy updates.",
     "ev": "G",
     "cells": {
      "angelite": [
       "n",
       "not planned: signals already update only what changes"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "n",
       ""
      ]
     },
     "where": {
      "react": "core"
     }
    },
    {
     "name": "Declarative lazy loading",
     "why": "Split the code and load parts on demand.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "`@defer` (idle, viewport, interaction, hover, timer, when) and routes with `load()`"
      ],
      "preact": [
       "y",
       "lazy and Suspense with compat"
      ],
      "vue": [
       "y",
       "defineAsyncComponent"
      ],
      "react": [
       "y",
       "lazy and Suspense"
      ],
      "angular": [
       "y",
       "@defer with triggers"
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "mod",
      "vue": "core",
      "react": "core",
      "angular": "core"
     }
    },
    {
     "name": "Server-side rendering (SSR)",
     "why": "SEO and a fast first paint.",
     "ev": "V",
     "cells": {
      "angelite": [
       "p",
       "`tools/ssr.mjs`: renders in Node with jsdom; no streaming"
      ],
      "preact": [
       "p",
       "preact-render-to-string, separate"
      ],
      "vue": [
       "y",
       "@vue/server-renderer"
      ],
      "react": [
       "y",
       "react-dom/server"
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "preact": "off",
      "vue": "mod",
      "react": "mod",
      "angular": "off",
      "angelite": "mod"
     }
    },
    {
     "name": "Hydration",
     "why": "Reuse the server's HTML instead of recreating it.",
     "ev": "D",
     "cells": {
      "angelite": [
       "p",
       "`hydrate()` replaces the server HTML without flicker; it does not adopt the nodes (the client renders again)"
      ],
      "preact": [
       "p",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "including incremental"
      ]
     },
     "where": {
      "preact": "core",
      "vue": "core",
      "react": "mod",
      "angular": "core",
      "angelite": "mod"
     }
    },
    {
     "name": "No build step",
     "why": "Use it with a single <script>.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "9.1 KB gzip with the compiler included"
      ],
      "preact": [
       "p",
       "with htm"
      ],
      "vue": [
       "y",
       "63.7 KB gzip the build with the compiler"
      ],
      "react": [
       "p",
       "createElement without JSX"
      ],
      "angular": [
       "n",
       "needs a compiler or the CLI"
      ]
     }
    }
   ]
  },
  {
   "title": "Architecture and structure",
   "rows": [
    {
     "name": "Dependency injection with scopes",
     "why": "Different services per component tree, easy to replace in tests.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "`providers` per component (scope: that component and its descendants); no module tree"
      ],
      "preact": [
       "y",
       "Context"
      ],
      "vue": [
       "y",
       "provide/inject"
      ],
      "react": [
       "y",
       "Context"
      ],
      "angular": [
       "y",
       "hierarchical injectors"
      ]
     },
     "where": {
      "angelite": "core",
      "preact": "core",
      "vue": "core",
      "react": "core",
      "angular": "core"
     }
    },
    {
     "name": "Router with nested routes, guards and lazy loading",
     "why": "Multi-screen applications.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "nested, `canActivate`, `resolve`, `load()`, `redirectTo`, query; hash and history modes"
      ],
      "preact": [
       "p",
       "preact-iso, separate"
      ],
      "vue": [
       "p",
       "official vue-router, separate"
      ],
      "react": [
       "n",
       "react-router is not official"
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "off",
      "vue": "off",
      "react": "ext",
      "angular": "off"
     }
    },
    {
     "name": "Reactive forms",
     "why": "Validation and state of complex forms.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "`FormControl`/`FormGroup`/`FormArray` on signals with validators; no async validators"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "p",
       "v-model"
      ],
      "react": [
       "p",
       "controlled inputs and actions"
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "vue": "ext",
      "react": "ext",
      "angular": "off",
      "angelite": "mod"
     }
    },
    {
     "name": "HTTP client with interceptors",
     "why": "Requests with retries, headers and centralized errors.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "on top of `fetch`: interceptors, `retry`, `timeout`, cancellation and `resource()` with signals"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "angular": "off",
      "angelite": "mod"
     }
    },
    {
     "name": "Official TypeScript types",
     "why": "Autocompletion and errors in the editor.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "`.d.ts` included, checked with `tsc` in CI"
      ],
      "preact": [
       "y",
       "included"
      ],
      "vue": [
       "y",
       "included"
      ],
      "react": [
       "p",
       "@types/react, separate"
      ],
      "angular": [
       "y",
       "written in TS"
      ]
     },
     "where": {
      "angelite": "core",
      "preact": "core",
      "vue": "core",
      "react": "ext",
      "angular": "core"
     }
    },
    {
     "name": "Template checking at compile time",
     "why": "Catch template errors before running.",
     "ev": "V",
     "cells": {
      "angelite": [
       "p",
       "elements, pipes and names the component does not have; it does not check types"
      ],
      "preact": [
       "y",
       "TSX"
      ],
      "vue": [
       "p",
       "vue-tsc"
      ],
      "react": [
       "y",
       "TSX"
      ],
      "angular": [
       "y",
       "strictTemplates"
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "ext",
      "vue": "off",
      "react": "ext",
      "angular": "off"
     }
    },
    {
     "name": "Error boundaries",
     "why": "A failure should not take down the whole app.",
     "ev": "G",
     "cells": {
      "angelite": [
       "p",
       "`ngOnError` catches bindings, handlers and projected content; not the constructor or `ngOnInit`"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "p",
       "global ErrorHandler"
      ]
     },
     "where": {
      "angelite": "core",
      "preact": "core",
      "vue": "core",
      "react": "core",
      "angular": "core"
     }
    },
    {
     "name": "Portals / teleport",
     "why": "Modals and menus outside their container.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "`<ng-portal to=\"#id\">`"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "p",
       "CDK overlay"
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "mod",
      "vue": "core",
      "react": "mod",
      "angular": "off"
     }
    },
    {
     "name": "Built-in animations and transitions",
     "why": "Elements entering and leaving.",
     "ev": "G",
     "cells": {
      "angelite": [
       "p",
       "`animate.enter` / `animate.leave` with CSS classes; no states or orchestration"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "y",
       "Transition"
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "vue": "core",
      "angular": "off",
      "angelite": "mod"
     }
    },
    {
     "name": "Named slots",
     "why": "Components with several content areas.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "`<ng-content select=\"x\">` + `slot=\"x\"`"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "select"
      ]
     },
     "where": {
      "angelite": "core",
      "preact": "core",
      "vue": "core",
      "react": "core",
      "angular": "core"
     }
    },
    {
     "name": "References to the DOM and to children",
     "why": "Access an element or a child component.",
     "ev": "G",
     "cells": {
      "angelite": [
       "y",
       "`#ref` + `viewChild()` (element or instance), `$el`"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "core",
      "vue": "core",
      "react": "core",
      "angular": "core"
     }
    },
    {
     "name": "Internationalization (i18n)",
     "why": "Translations and formats per language.",
     "ev": "G",
     "cells": {
      "angelite": [
       "p",
       "messages, plurals (`Intl`), fallback languages, lazy loading and formats; no text extraction"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "angular": "off",
      "angelite": "mod"
     }
    }
   ]
  },
  {
   "title": "Ecosystem and tooling",
   "rows": [
    {
     "name": "DevTools",
     "why": "Inspect components and state.",
     "ev": "V",
     "cells": {
      "angelite": [
       "p",
       "`enableDevtools()`: component and signal tree (API and panel); no browser extension"
      ],
      "preact": [
       "y",
       "preact/devtools"
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "preact": "off",
      "vue": "off",
      "react": "off",
      "angular": "off",
      "angelite": "mod"
     }
    },
    {
     "name": "Official testing utilities",
     "why": "Test components without mounting a browser.",
     "ev": "V",
     "cells": {
      "angelite": [
       "y",
       "`render`, `click`, `type`, `flush`, `provide`, `cleanup`"
      ],
      "preact": [
       "y",
       "preact/test-utils"
      ],
      "vue": [
       "p",
       "@vue/test-utils, separate"
      ],
      "react": [
       "y",
       "react-dom/test-utils"
      ],
      "angular": [
       "y",
       "TestBed"
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "mod",
      "vue": "off",
      "react": "mod",
      "angular": "mod"
     }
    },
    {
     "name": "Development messages (dev warnings)",
     "why": "Useful warnings when something is misused.",
     "ev": "V",
     "cells": {
      "angelite": [
       "p",
       "`enableDevWarnings()`: unknown inputs, repeated keys, missing modules and unknown elements"
      ],
      "preact": [
       "p",
       "preact/debug"
      ],
      "vue": [
       "y",
       "Vue warn"
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "NG0xxx errors"
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "mod",
      "vue": "core",
      "react": "core"
     }
    },
    {
     "name": "CLI, HMR and tooling",
     "why": "Start and develop without configuring anything.",
     "ev": "G",
     "cells": {
      "angelite": [
       "p",
       "esbuild and Vite plugins (reload on edit) and `angelite-check`; no project generator"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "p",
       "depends on Vite or Next"
      ],
      "angular": [
       "y",
       ""
      ]
     },
     "where": {
      "angelite": "mod",
      "preact": "off",
      "vue": "off",
      "react": "ext",
      "angular": "off"
     }
    },
    {
     "name": "Editor support for templates",
     "why": "Autocompletion inside templates.",
     "ev": "G",
     "cells": {
      "angelite": [
       "p",
       "`angelite-check` gives `file:line: message`; no autocompletion or language service"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       "Volar"
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "language service"
      ]
     },
     "where": {
      "preact": "ext",
      "vue": "off",
      "react": "ext",
      "angular": "off",
      "angelite": "mod"
     }
    },
    {
     "name": "Maturity, community and API stability",
     "why": "Who uses it, what guarantees exist between versions.",
     "ev": "V",
     "cells": {
      "angelite": [
       "n",
       "new project, no API guarantee"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    }
   ]
  }
 ],
 "where": {
  "core": "Built into the main package",
  "mod": "Optional module of the same package (separate import, costs nothing if unused)",
  "off": "Separate official package (same team)",
  "ext": "Third party / ecosystem"
 },
 "evidenceWhere": "The location (tag column) is general knowledge (G): check it in the documentation before quoting it."
};
