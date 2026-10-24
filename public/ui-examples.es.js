// Examples of the component library page. The API tables come from the library itself (data/ui-meta.json); this file only
// says how to show each component:
//   props:   initial values of the inputs in the playground
//   data:    values for inputs that are lists or objects (they have no control)
//   extra:   more cells for the variants gallery: [{ label, set: { input: value } }]
//   content: what goes between the tags (HTML; slot="..." children work)
//   before / after: HTML around the component (the host exposes every input as a signal, `on(name, value)`, `toast`)
window.UI_EXAMPLES = {
  button: { props: { variant: 'primary' }, content: 'Guardar' },
  badge: { props: { variant: 'success' }, content: 'Nuevo' },
  chip: { props: { removable: true }, content: 'Etiqueta' },
  avatar: { props: { name: 'Ada Lovelace', size: 48, status: 'online' } },
  divider: { props: { label: 'o' } },
  card: { props: { title: 'Tarjeta' }, content: 'Contenido de la tarjeta.<span slot="footer">Pie de la tarjeta</span>' },
  alert: { props: { type: 'info', title: 'Aviso', dismissible: true }, content: 'Este es un mensaje de ejemplo.' },
  spinner: {},
  progress: { props: { value: 60, label: 'Subida' } },
  skeleton: { props: { height: 20 } },
  'empty-state': { props: { title: 'Aún no hay nada', description: 'Crea tu primer elemento para empezar.' }, content: '<ui-button variant="primary">Crear elemento</ui-button>' },
  'text-field': { extra: [{ label: 'con error', set: { error: 'Escribe un correo válido' } }, { label: 'con valor', set: { value: 'ada@correo.com' } }], props: { label: 'Correo', placeholder: 'tu@correo.com', hint: 'No lo compartimos con nadie' } },
  textarea: { extra: [{ label: 'con error', set: { error: 'Cuéntanos un poco más' } }], props: { label: 'Descripción', rows: 3, placeholder: 'Cuéntanos…' } },
  select: { extra: [{ label: 'con error', set: { error: 'Elige un país' } }], props: { label: 'País', value: 'mx' }, data: { options: [{ value: 'es', label: 'España' }, { value: 'mx', label: 'México' }, { value: 'co', label: 'Colombia' }, { value: 'xx', label: 'Atlántida', disabled: true }] } },
  checkbox: { props: { label: 'Acepto los términos' } },
  'radio-group': { props: { label: 'Tamaño', value: 'm' }, data: { options: [{ value: 's', label: 'Pequeño' }, { value: 'm', label: 'Mediano' }, { value: 'l', label: 'Grande' }] } },
  toggle: { props: { label: 'Notificaciones' } },
  slider: { props: { label: 'Volumen', value: 40 } },
  rating: { props: { value: 3 } },
  combobox: { props: { label: 'Lenguaje', value: 'js' }, data: { options: [{ value: 'js', label: 'JavaScript' }, { value: 'ts', label: 'TypeScript' }, { value: 'py', label: 'Python' }, { value: 'go', label: 'Go' }, { value: 'rs', label: 'Rust' }] } },
  tabs: { props: { active: 'uno', label: 'Secciones' }, data: { tabs: [{ id: 'uno', label: 'Resumen' }, { id: 'dos', label: 'Detalles' }, { id: 'tres', label: 'Historial' }] }, after: '<p>Pestaña activa: <b>{{ active() }}</b></p>' },
  breadcrumb: { data: { items: [{ label: 'Inicio', href: '#' }, { label: 'Proyectos', href: '#' }, { label: 'AngeLite' }] } },
  pagination: { props: { total: 250, pageSize: 10, page: 5 }, after: '<p>Página <b>{{ page() }}</b></p>' },
  stepper: { props: { current: 1 }, data: { steps: ['Cuenta', 'Perfil', 'Confirmar'] } },
  'accordion-item': { props: { title: '¿Qué es AngeLite?' }, content: 'Un framework de señales con plantillas al estilo de Angular.' },
  dropdown: { props: { label: 'Acciones' }, data: { items: ['Editar', 'Duplicar', { value: 'borrar', label: 'Borrar', disabled: true }] } },
  modal: { props: { title: 'Título del diálogo' }, before: '<ui-button (click)="open.set(true)">Abrir el modal</ui-button> <ui-button (click)="size.set(\'sm\'); open.set(true)">Pequeño</ui-button> <ui-button (click)="size.set(\'md\'); open.set(true)">Mediano</ui-button> <ui-button (click)="size.set(\'lg\'); open.set(true)">Grande</ui-button>', content: '<p>Contenido del diálogo. Tab se queda dentro; Escape lo cierra.</p><ui-button variant="primary" (click)="open.set(false)">Aceptar</ui-button>' },
  drawer: { props: { title: 'Menú', side: 'left' }, before: '<ui-button (click)="side.set(\'left\'); open.set(true)">Izquierda</ui-button> <ui-button (click)="side.set(\'right\'); open.set(true)">Derecha</ui-button> <ui-button (click)="side.set(\'bottom\'); open.set(true)">Abajo</ui-button>', content: '<p>Un panel lateral, útil para menús en móvil.</p>' },
  popover: { props: { label: 'Más información' }, content: '<p style="margin:0">Contenido del panel flotante.</p>' },
  tooltip: { props: { text: 'Guarda los cambios' }, content: 'Pasa el ratón o enfoca con Tab' },
  toasts: { before: `<ui-button (click)="toast.show('Guardado correctamente', 'success')">Aviso de éxito</ui-button> <ui-button (click)="toast.show('No se pudo guardar', 'error', 0)">Aviso fijo</ui-button> <ui-button variant="ghost" (click)="toast.clear()">Limpiar</ui-button>` },
  table: { props: { caption: 'Equipo', striped: true }, data: { columns: [{ key: 'name', label: 'Nombre' }, { key: 'role', label: 'Rol' }, { key: 'age', label: 'Edad', align: 'right' }], rows: [{ name: 'Ada', role: 'Matemática', age: 36 }, { name: 'Grace', role: 'Almirante', age: 85 }, { name: 'Linus', role: 'Ingeniero', age: 55 }] } },
  'code-block': { props: { language: 'js', code: "const count = signal(0);\ncount.update(n => n + 1);" } }
};
