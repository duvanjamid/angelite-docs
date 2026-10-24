/**
 * The component library page, built with AngeLite itself (core + AngeLite UI).
 * The API tables, accessibility notes and inputs come from the library (window.UI_META); how each component is shown
 * comes from ui-examples.js. Every component gets a playground: controls generated from its inputs, a live preview and
 * the template that produces it.
 */
const { signal, computed, component, mount, input, inject } = AngeLite;
const ui = AngeLiteUI;
const { groups, components } = window.UI_META;
const EX = window.UI_EXAMPLES || {};

const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const parse = text => { try { return Function(`return (${text})`)(); } catch (e) { return text; } };
const union = type => (/^(?:\s*'[^']*'\s*\|?)+$/.test(type) ? [...type.matchAll(/'([^']*)'/g)].map(m => m[1]) : null);
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** What a control looks like for an input: from its documented type. */
function controlFor(input, def, ex) {
  if (ex.data && input.name in ex.data) return null;           // lists and objects have no control
  if (input.type === 'boolean') return 'bool';
  if (input.type === 'number') return 'number';
  const values = union(input.type.replace(/^'' \| /, "'' | "));
  if (values) return { options: values.map(v => ({ value: v, label: v === '' ? '(vacío)' : v })) };
  if (input.type === 'string') return 'text';
  return null;
}


/* ---------- variants: every option of an input shown at once, no need to pick one ---------- */

const NO_GALLERY = new Set(['table', 'code-block', 'tabs', 'pagination', 'breadcrumb', 'stepper', 'accordion-item']);
const FLAG_SKIP = new Set(['open', 'visible', 'checked', 'indeterminate', 'dismissible', 'removable']);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');



/* Overlays cannot be open all at once on a page (they lock scroll and trap focus), so their open states are shown as
   static snapshots built with the library's own classes. The playground below each one still opens the real thing. */
const btn = (text, v) => `<button type="button" class="ui-btn"${v ? ` data-variant="${v}"` : ''}>${text}</button>`;
const modalSnap = size => `<div class="snap" style="width:min(100%,${{ sm: 340, md: 460, lg: 620 }[size]}px)"><div class="ui-backdrop"><div class="ui-modal" data-size="${size}" role="img" aria-label="Modal abierto"><header><span>Título del diálogo</span><button type="button" tabindex="-1">×</button></header><div class="body"><p>Contenido del diálogo. Tab se queda dentro y Escape lo cierra.</p>${btn('Aceptar', 'primary')}</div></div></div></div>`;
const drawerSnap = side => `<div class="snap"><div class="ui-drawer-wrap" data-side="${side}"><div class="ui-drawer" role="img" aria-label="Panel abierto"><header><span>Menú</span><button type="button" tabindex="-1">×</button></header><div class="body"><p>Un panel lateral, útil para menús en móvil.</p></div></div></div></div>`;
const popSnap = (placement, align) => `<div class="snapbox" data-placement="${placement}"><div class="ui-pop" data-placement="${placement}" data-align="${align}">${btn('Más información')}<div class="panel" role="img" aria-label="Panel abierto"><p style="margin:0">Contenido del panel flotante.</p></div></div></div>`;
const ddSnap = align => `<div class="snapbox"><div class="ui-dd" data-align="${align}">${btn('Acciones')}<div class="menu" role="img" aria-label="Menú abierto"><button type="button" role="menuitem" tabindex="-1">Editar</button><button type="button" role="menuitem" tabindex="-1">Duplicar</button><button type="button" role="menuitem" aria-disabled="true" tabindex="-1">Borrar</button></div></div></div>`;
const toastSnap = (type, text) => `<div class="ui-toast" data-type="${type}" role="img" aria-label="Aviso"><span class="m">${text}</span><button type="button" tabindex="-1">×</button></div>`;
const SNAP = {
  modal: [{ name: 'size', cells: ['sm', 'md', 'lg'].map(v => ({ label: v, html: modalSnap(v) })) }],
  drawer: [{ name: 'side', cells: ['left', 'right', 'bottom'].map(v => ({ label: v, html: drawerSnap(v), cls: 'wide' })) }],
  popover: [{ name: 'placement', cells: [{ label: 'bottom', html: popSnap('bottom', 'start') }, { label: 'top', html: popSnap('top', 'start') }] }],
  dropdown: [{ name: 'align', cells: [{ label: 'start', html: ddSnap('start') }, { label: 'end', html: ddSnap('end') }] }],
  toasts: [{ name: 'type', cells: [['success', 'Guardado correctamente'], ['error', 'No se pudo guardar'], ['warning', 'Conexión lenta'], ['info', 'Hay una versión nueva']].map(([t, x]) => ({ label: t, html: toastSnap(t, x), cls: 'toast' })) }]
};

/** Rows of cells: one row per input with a few string options, plus one row with the boolean states. */
function galleryRows(m, ex) {
  if (SNAP[m.id]) return SNAP[m.id];
  if ((m.group === 'Superposiciones' && m.id !== 'tooltip') || NO_GALLERY.has(m.id)) return [];
  const data = ex.data || {};
  const rows = [];
  for (const inp of m.inputs) {
    if (inp.name in data) continue;
    const opts = union(inp.type);
    if (opts && opts.length > 1 && opts.length <= 8) rows.push({ name: inp.name, cells: opts.filter(v => v !== '').map(v => ({ label: v, set: { [inp.name]: v }, cls: m.id === 'tooltip' ? 'room' : '' })) });
  }
  const flags = m.inputs.filter(i => i.type === 'boolean' && !(i.name in data) && !FLAG_SKIP.has(i.name)).slice(0, 6);
  if (ex.extra) rows.push({ name: 'otros', cells: ex.extra });
  if (flags.length) rows.push({ name: 'estados', cells: flags.map(f => ({ label: f.name, set: { [f.name]: true } })) });
  return rows;
}

function galleryTemplate(m, ex, rows) {
  const data = ex.data || {};
  const attrs = set => {
    const all = { ...(ex.props || {}), ...set };
    return Object.entries(all).filter(([k, v]) => !(k in data) && !(v !== null && typeof v === 'object'))
      .map(([k, v]) => (typeof v === 'string' ? `${k}="${esc(v)}"` : `[${k}]="${v}"`)).concat(Object.keys(data).map(k => `[${k}]="${k}"`)).join(' ');
  };
  return rows.map(r => `<div class="vrow"><span class="vname">${esc(r.name)}</span><div class="vcells">` +
    r.cells.map(c => `<figure class="vcell ${c.cls || ''}">${c.html || `<${m.tag} ${attrs(c.set)}>${ex.content || ''}</${m.tag}>`}<figcaption>${esc(c.label)}</figcaption></figure>`).join('') +
    '</div></div>').join('');
}

/* ---------- playground: controls + live preview + generated template ---------- */

class Playground {
  item = input(null);
  last = signal('—');
  controls = [];
  rows = [];
  snippet = signal('');

  ngOnInit() {
    const m = this.item(), ex = EX[m.id] || {};
    const props = ex.props || {};
    this.signals = {};
    for (const inp of m.inputs) {
      const initial = inp.name in props ? props[inp.name] : (ex.data && inp.name in ex.data ? ex.data[inp.name] : parse(inp.default));
      this.signals[inp.name] = signal(initial);
      const kind = controlFor(inp, initial, ex);
      if (!kind) continue;
      const s = this.signals[inp.name];
      const c = { name: inp.name, kind: typeof kind === 'string' ? kind : 'select', options: kind.options || [], value: s, set: v => s.set(v) };
      if (c.kind === 'number') {
        c.text = computed(() => String(s()));
        c.setText = t => { const n = Number(t); if (t !== '' && !Number.isNaN(n)) s.set(n); };
      }
      this.controls.push(c);
    }
    this.snippet = computed(() => this.build(m, ex));
    this.rows = galleryRows(m, ex);
  }

  /** The template a user would write: only inputs that differ from their defaults. */
  build(m, ex) {
    const parts = [];
    for (const inp of m.inputs) {
      const v = this.signals[inp.name](), def = parse(inp.default);
      if (ex.data && inp.name in ex.data) { parts.push(`[${inp.name}]="${inp.name}"`); continue; }
      if (JSON.stringify(v) === JSON.stringify(def)) continue;
      parts.push(typeof v === 'string' ? `${inp.name}="${attr(v)}"` : `[${inp.name}]="${attr(JSON.stringify(v))}"`);
    }
    for (const o of m.outputs) parts.push(`(${o.name})="…"`);
    const open = `<${m.tag}${parts.length ? ' ' + parts.join(' ') : ''}>`;
    return ex.content ? `${open}${ex.content.replace(/></g, '>\n  <')}</${m.tag}>` : `${open}</${m.tag}>`;
  }

  ngAfterViewInit() {
    const m = this.item(), ex = EX[m.id] || {};
    const signals = this.signals, last = this.last;
    const on = (name, value) => {
      last.set(`${name}(${value === undefined ? '' : JSON.stringify(value)})`);
      const base = name.replace(/Change$/, '');
      if (name === 'changed' && signals.checked) signals.checked.set(value);
      else if (name === 'closed' && signals.open) signals.open.set(false);
      else if (/Change$/.test(name) && signals[base]) signals[base].set(value);
    };
    const data = ex.data || {};
    class Host {
      constructor() {
        for (const [k, s] of Object.entries(signals)) this[k] = k in data ? data[k] : s; // lists and objects are plain values, the rest are signals
        this.toast = inject(ui.ToastService);
        this.on = on;
      }
    }
    const attrs = m.inputs.map(i => (ex.data && i.name in ex.data ? `[${i.name}]="${i.name}"` : `[${i.name}]="${i.name}()"`)).join(' ');
    const events = m.outputs.map(o => `(${o.name})="on('${o.name}', $event)"`).join(' ');
    component(Host, {
      selector: `docs-preview-${m.id}`,
      imports: ui.all,
      template: `${ex.before || ''}<${m.tag} ${attrs} ${events}>${ex.content || ''}</${m.tag}>${ex.after || ''}`
    });
    this.handle = mount(Host, this.$el.querySelector('.preview'));
    const box = this.$el.querySelector('.vbody');
    if (box) {
      class Gallery { constructor() { for (const [k, v] of Object.entries(data)) this[k] = v; } }
      component(Gallery, { selector: `docs-variants-${m.id}`, imports: ui.all, template: galleryTemplate(m, ex, this.rows) });
      this.vhandle = mount(Gallery, box);
    }
  }

  ngOnDestroy() { if (this.handle) this.handle.destroy(); if (this.vhandle) this.vhandle.destroy(); }
}
component(Playground, {
  selector: 'docs-playground',
  imports: [ui.Checkbox, ui.Select, ui.TextField, ui.CodeBlock],
  template: `
    @if (rows.length) {<div class="variants" role="group" aria-label="Variantes"><div class="vhead">Variantes</div><div class="vbody"></div></div>}
    <div class="pg">
      <div class="pg-stage">
        <div class="preview"></div>
        <p class="evlog" aria-live="polite"><span>Último evento:</span> <code>{{ last() }}</code></p>
      </div>
      @if (controls.length) {
        <div class="pg-controls" role="group" aria-label="Controles de las propiedades">
          @for (c of controls; track c.name) {
            @if (c.kind === 'bool') {<ui-checkbox [label]="c.name" [checked]="c.value()" (changed)="c.set($event)"></ui-checkbox>}
            @else if (c.kind === 'select') {<ui-select [label]="c.name" [options]="c.options" [value]="c.value()" (valueChange)="c.set($event)"></ui-select>}
            @else if (c.kind === 'number') {<ui-text-field type="number" [label]="c.name" [value]="c.text()" (valueChange)="c.setText($event)"></ui-text-field>}
            @else {<ui-text-field [label]="c.name" [value]="c.value()" (valueChange)="c.set($event)"></ui-text-field>}
          }
        </div>
      }
    </div>
    <ui-code-block language="plantilla" [code]="snippet()" copyLabel="Copiar" copiedLabel="Copiado"></ui-code-block>`
});

/* ---------- one component: summary, playground, API ---------- */

class Section {
  item = input(null);
  inputCols = [{ key: 'name', label: 'Input' }, { key: 'type', label: 'Tipo' }, { key: 'default', label: 'Por defecto' }, { key: 'desc', label: 'Descripción' }];
  outputCols = [{ key: 'name', label: 'Output' }, { key: 'payload', label: 'Valor' }, { key: 'desc', label: 'Cuándo' }];
  slotCols = [{ key: 'name', label: 'Slot' }, { key: 'desc', label: 'Contenido' }];
}
component(Section, {
  selector: 'docs-section',
  imports: [Playground, ui.Badge, ui.Table, ui.Alert],
  template: `
    <section class="ui-sec" [attr.id]="item().id" [attr.aria-labelledby]="item().id + '-h'">
      <h3 [attr.id]="item().id + '-h'">{{ item().name }} <ui-badge>{{ item().tag }}</ui-badge><a class="anchor" [href]="'#' + item().id" [attr.aria-label]="'Enlace a ' + item().name">#</a></h3>
      <p>{{ item().summary }}</p>
      <docs-playground [item]="item()"></docs-playground>
      <h4>Inputs</h4>
      @if (item().inputs.length) {<ui-table [columns]="inputCols" [rows]="item().inputs" rowKey="name" [dense]="true"></ui-table>} @else {<p class="muted">No tiene inputs.</p>}
      @if (item().outputs.length) {<h4>Outputs</h4><ui-table [columns]="outputCols" [rows]="item().outputs" rowKey="name" [dense]="true"></ui-table>}
      @if (item().slots.length) {<h4>Slots</h4><ui-table [columns]="slotCols" [rows]="item().slots" rowKey="name" [dense]="true"></ui-table>}
      <ui-alert type="info" title="Accesibilidad">{{ item().a11y }}</ui-alert>
    </section>`
});

/* ---------- theme editor ---------- */

class ThemePanel {
  primary = signal('#d6336c');
  accent = signal('#ef7b4f');
  radius = signal(8);
  target() { return document.documentElement; }
  css = computed(() => `:root {\n  --ui-primary: ${this.primary()};\n  --ui-accent: ${this.accent()};\n  --ui-radius: ${this.radius()}px;\n}`);
  apply() {
    const el = this.target();
    el.style.setProperty('--ui-primary', this.primary());
    el.style.setProperty('--ui-accent', this.accent());
    el.style.setProperty('--ui-radius', this.radius() + 'px');
    el.style.setProperty('--primary', this.primary());
  }
  reset() { this.primary.set('#d6336c'); this.accent.set('#ef7b4f'); this.radius.set(8); ['--ui-primary', '--ui-accent', '--ui-radius', '--primary'].forEach(k => this.target().style.removeProperty(k)); }
  setPrimary(v) { this.primary.set(v); this.apply(); }
  setAccent(v) { this.accent.set(v); this.apply(); }
  setRadius(v) { this.radius.set(v); this.apply(); }
}
component(ThemePanel, {
  selector: 'docs-theme',
  imports: [ui.TextField, ui.Slider, ui.Button, ui.CodeBlock],
  template: `
    <div class="pg-controls theme">
      <ui-text-field label="--ui-primary" type="color" [value]="primary()" (valueChange)="setPrimary($event)"></ui-text-field>
      <ui-text-field label="--ui-accent" type="color" [value]="accent()" (valueChange)="setAccent($event)"></ui-text-field>
      <ui-slider label="--ui-radius" [min]="0" [max]="20" [value]="radius()" (valueChange)="setRadius($event)"></ui-slider>
      <div><ui-button size="sm" (click)="reset()">Restablecer</ui-button></div>
    </div>
    <ui-code-block language="css" [code]="css()"></ui-code-block>`
});


/* ---------- overview: every component at a glance, live and inert ---------- */

let uid = 0;
function mountHtml(el, html, data) {
  class Frag { constructor() { Object.assign(this, data || {}); } }
  component(Frag, { selector: `docs-frag-${++uid}`, imports: ui.all, template: html });
  return mount(Frag, el);
}

/** A small, representative rendering of a component: its example as it appears in the playground. */
function tileHtml(m) {
  const ex = EX[m.id] || {};
  if (SNAP[m.id]) return SNAP[m.id][0].cells[Math.min(1, SNAP[m.id][0].cells.length - 1)].html;
  const data = ex.data || {};
  const attrs = Object.entries(ex.props || {}).filter(([k, v]) => !(k in data) && !(v !== null && typeof v === 'object'))
    .map(([k, v]) => (typeof v === 'string' ? `${k}="${esc(v)}"` : `[${k}]="${v}"`)).concat(Object.keys(data).map(k => `[${k}]="${k}"`)).join(' ');
  return `<${m.tag} ${attrs}>${ex.content || ''}</${m.tag}>`;
}

class Overview {
  groups = groups.map(g => ({ name: g, items: components.filter(c => c.group === g) }));
  handles = [];
  ngAfterViewInit() {
    for (const m of components) {
      const box = this.$el.querySelector(`[data-tile="${m.id}"]`);
      if (box) this.handles.push(mountHtml(box, tileHtml(m), (EX[m.id] || {}).data));
    }
  }
  ngOnDestroy() { this.handles.forEach(h => h.destroy()); }
}
component(Overview, {
  selector: 'docs-overview',
  template: `
    @for (g of groups; track g.name) {
      <h3 class="ovgroup">{{ g.name }}</h3>
      <div class="ov">
        @for (c of g.items; track c.id) {
          <div class="ovtile">
            <div class="ovprev" inert aria-hidden="true"><div class="ovin" [attr.data-tile]="c.id"></div></div>
            <a [href]="'#' + c.id">{{ c.name }}</a>
          </div>
        }
      </div>
    }`
});

/* ---------- the page ---------- */

class UiPage {
  query = signal('');
  groups = groups.map(g => ({ name: g, id: 'grupo-' + slug(g), items: components.filter(c => c.group === g) }));
  total = components.length;
  matches(c) {
    const q = this.query().trim().toLowerCase();
    return !q || `${c.name} ${c.tag} ${c.summary}`.toLowerCase().includes(q);
  }
  visible = computed(() => components.filter(c => this.matches(c)).length);
  ngAfterViewInit() {
    if (location.hash) setTimeout(() => { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }, 50);
  }
}
component(UiPage, {
  selector: 'docs-ui',
  imports: [Section, ThemePanel, Overview, ui.TextField, ui.EmptyState, ui.Button],
  template: `
    <div class="ui-lib">
      <p>{{ total }} componentes accesibles: <code>{{ '<' }}ui-button{{ '>' }}</code>, <code>{{ '<' }}ui-modal{{ '>' }}</code>, <code>{{ '<' }}ui-table{{ '>' }}</code>… Se usan como cualquier componente de AngeLite: los importas en <code>imports</code> y los pones en la plantilla. Cada uno es una clase marcada como pura, así que un bundler se queda solo con los que importes.</p>
      <div class="callout"><span class="t">Cómo se usan</span>
        <pre class="plain"><code>import { Button, Modal } from '@duvanjamid/angelite/ui';

component(App, {
  imports: [Button, Modal],
  template: \`&lt;ui-button variant="primary"&gt;Guardar&lt;/ui-button&gt;\`
});</code></pre>
      </div>
      <h2 id="vista-general">Vista general</h2>
      <p>Los 33 componentes de un vistazo, ya montados. Pulsa el nombre para ver sus variantes, controles y API.</p>
      <docs-overview></docs-overview>
      <h2 id="tema">Tema</h2>
      <p>Todo el aspecto sale de variables CSS (<code>--ui-*</code>). Cambia estas tres, o define las tuyas en <code>:root</code>. El modo oscuro sigue al sistema, o al interruptor de arriba (<code>&lt;html data-theme="dark"&gt;</code>).</p>
      <docs-theme></docs-theme>
      <ui-text-field class="filter" label="Filtrar componentes" placeholder="botón, tabla, modal…" [value]="query()" (valueChange)="query.set($event)"></ui-text-field>
      <p class="muted" aria-live="polite">{{ visible() }} de {{ total }} componentes</p>
      @for (g of groups; track g.id) {
        <h2 [attr.id]="g.id">{{ g.name }}</h2>
        @for (c of g.items; track c.id) {@if (matches(c)) {<docs-section [item]="c"></docs-section>}}
      }
      @if (visible() === 0) {<ui-empty-state title="Ningún componente coincide" description="Prueba con otra palabra."><ui-button (click)="query.set('')">Quitar el filtro</ui-button></ui-empty-state>}
    </div>`
});

const appRoot = document.getElementById('app');
appRoot.textContent = '';
mount(UiPage, appRoot);
