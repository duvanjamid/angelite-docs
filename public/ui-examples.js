// Examples of the component library page (English; ui-examples.es.js is the Spanish version). The API tables come from the library itself (data/ui-meta.json); this file only
// says how to show each component:
//   props:   initial values of the inputs in the playground
//   data:    values for inputs that are lists or objects (they have no control)
//   extra:   more cells for the variants gallery: [{ label, set: { input: value } }]
//   content: what goes between the tags (HTML; slot="..." children work)
//   before / after: HTML around the component (the host exposes every input as a signal, `on(name, value)`, `toast`)
window.UI_EXAMPLES = {
  button: { props: { variant: 'primary' }, content: 'Save' },
  badge: { props: { variant: 'success' }, content: 'New' },
  chip: { props: { removable: true }, content: 'Label' },
  avatar: { props: { name: 'Ada Lovelace', size: 48, status: 'online' } },
  divider: { props: { label: 'or' } },
  card: { props: { title: 'Card' }, content: 'Card content.<span slot="footer">Card footer</span>' },
  alert: { props: { type: 'info', title: 'Notice', dismissible: true }, content: 'This is a sample message.' },
  spinner: {},
  progress: { props: { value: 60, label: 'Upload' } },
  skeleton: { props: { height: 20 } },
  'empty-state': { props: { title: 'Nothing here yet', description: 'Create your first item to get started.' }, content: '<ui-button variant="primary">Create item</ui-button>' },
  'text-field': { extra: [{ label: 'with error', set: { error: 'Enter a valid email' } }, { label: 'with value', set: { value: 'ada@example.com' } }], props: { label: 'Email', placeholder: 'you@example.com', hint: 'We never share it' } },
  textarea: { extra: [{ label: 'with error', set: { error: 'Tell us a little more' } }], props: { label: 'Description', rows: 3, placeholder: 'Tell us…' } },
  select: { extra: [{ label: 'with error', set: { error: 'Choose a country' } }], props: { label: 'Country', value: 'mx' }, data: { options: [{ value: 'es', label: 'Spain' }, { value: 'mx', label: 'Mexico' }, { value: 'co', label: 'Colombia' }, { value: 'xx', label: 'Atlantis', disabled: true }] } },
  checkbox: { props: { label: 'I accept the terms' } },
  'radio-group': { props: { label: 'Size', value: 'm' }, data: { options: [{ value: 's', label: 'Small' }, { value: 'm', label: 'Medium' }, { value: 'l', label: 'Large' }] } },
  toggle: { props: { label: 'Notifications' } },
  slider: { props: { label: 'Volume', value: 40 } },
  rating: { props: { value: 3 } },
  combobox: { props: { label: 'Language', value: 'js' }, data: { options: [{ value: 'js', label: 'JavaScript' }, { value: 'ts', label: 'TypeScript' }, { value: 'py', label: 'Python' }, { value: 'go', label: 'Go' }, { value: 'rs', label: 'Rust' }] } },
  tabs: { props: { active: 'one', label: 'Sections' }, data: { tabs: [{ id: 'one', label: 'Overview' }, { id: 'two', label: 'Details' }, { id: 'three', label: 'History' }] }, after: '<p>Active tab: <b>{{ active() }}</b></p>' },
  breadcrumb: { data: { items: [{ label: 'Home', href: '#' }, { label: 'Projects', href: '#' }, { label: 'AngeLite' }] } },
  pagination: { props: { total: 250, pageSize: 10, page: 5 }, after: '<p>Page <b>{{ page() }}</b></p>' },
  stepper: { props: { current: 1 }, data: { steps: ['Account', 'Profile', 'Confirm'] } },
  'accordion-item': { props: { title: 'What is AngeLite?' }, content: 'A signals framework with Angular-style templates.' },
  dropdown: { props: { label: 'Actions' }, data: { items: ['Edit', 'Duplicate', { value: 'delete', label: 'Delete', disabled: true }] } },
  modal: { props: { title: 'Dialog title' }, before: '<ui-button (click)="open.set(true)">Open the modal</ui-button> <ui-button (click)="size.set(\'sm\'); open.set(true)">Small</ui-button> <ui-button (click)="size.set(\'md\'); open.set(true)">Medium</ui-button> <ui-button (click)="size.set(\'lg\'); open.set(true)">Large</ui-button>', content: '<p>Dialog content. Tab stays inside; Escape closes it.</p><ui-button variant="primary" (click)="open.set(false)">Accept</ui-button>' },
  drawer: { props: { title: 'Menu', side: 'left' }, before: '<ui-button (click)="side.set(\'left\'); open.set(true)">Left</ui-button> <ui-button (click)="side.set(\'right\'); open.set(true)">Right</ui-button> <ui-button (click)="side.set(\'bottom\'); open.set(true)">Bottom</ui-button>', content: '<p>A side panel, handy for menus on mobile.</p>' },
  popover: { props: { label: 'More information' }, content: '<p style="margin:0">Content of the floating panel.</p>' },
  tooltip: { props: { text: 'Saves your changes' }, content: 'Hover or focus with Tab' },
  toasts: { before: `<ui-button (click)="toast.show('Saved successfully', 'success')">Success notice</ui-button> <ui-button (click)="toast.show('Could not save', 'error', 0)">Sticky notice</ui-button> <ui-button variant="ghost" (click)="toast.clear()">Clear</ui-button>` },
  table: { props: { caption: 'Team', striped: true }, data: { columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'age', label: 'Age', align: 'right' }], rows: [{ name: 'Ada', role: 'Mathematician', age: 36 }, { name: 'Grace', role: 'Admiral', age: 85 }, { name: 'Linus', role: 'Engineer', age: 55 }] } },
  'code-block': { props: { language: 'js', code: "const count = signal(0);\ncount.update(n => n + 1);" } }
};
