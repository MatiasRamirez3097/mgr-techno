# Plan: rediseño del panel de administración (orden de formularios + responsive)

Estado: **aprobado** (2026-11-16) · PR 1 (fases 0 + 1): `feat/admin-ui-foundation` · PR 2 (fase 2): `feat/admin-ui-lists` · sigue la fase 3

Objetivos:
1. Formularios más cortos de recorrer y ordenados: secciones claras, navegación entre secciones y
   "Guardar" siempre a mano.
2. Panel usable en el celular (375 px de ancho como referencia), sin perder nada en escritorio.

Regla general: **no se cambia lógica de negocio ni APIs**. Sólo estructura visual, componentes de
presentación y estilos. Cada fase es un PR separado y se puede pausar entre fases.

---

## Diagnóstico (revisión del código)

### Formularios largos
| Formulario | Líneas | Problemas |
|---|---|---|
| `ProductForm.tsx` | 1.575 | 7 secciones en columna (Tipo, Combo, Info básica, Atributos ~480 líneas, Precios, Stock, Envío) + barra lateral (Publicación, Imágenes, Categorías). **Precios queda debajo de los atributos**. El botón Guardar está en la barra lateral: en el celular queda al final de todo. |
| `OrderForm.tsx` | 1.412 | Ítems y pagos en filas `grid-cols-12` fijas (ilegibles en el celular). Guardar en la barra lateral. |
| `QuoteForm.tsx` | 1.216 | Cliente → Ítems → Notas → Vigencia → Totales; Totales y Guardar al final. |
| `PurchaseForm.tsx` | 968 | Ítems en `grid-cols-12` fijo; `grid-cols-2` fijo en datos básicos y totales. |
| `CategoryForm.tsx` | 817 | Editor de atributos de ~300 líneas en una sola sección. |
| `CustomerForm`, `SupplierForm`, `ReceivePurchaseForm`, `InventoryAllocationSection`, `OrderPaymentsSection` | 370–610 | Sin agrupar; grillas fijas de 2 columnas. |

No hay componentes de UI compartidos: cada formulario define su propio `inputClass` (unas 90
definiciones repetidas), sus propias tarjetas de sección y encabezados.

### Responsive
- **Navegación**: la barra lateral ya tiene menú hamburguesa en el celular (está bien resuelto);
  falta revisar que se cierre al navegar y que el contenido no quede tapado por la barra superior.
- **Tablas**: 8 listados con 7 a 9 columnas. Las de Productos, Órdenes, Clientes y Categorías
  (y el detalle de cliente) están dentro de `overflow-hidden`, así que **en el celular se cortan**
  (no se pueden ver las columnas de la derecha ni las acciones).
- **Filas de ítems** con `grid-cols-12` fijo en Órdenes y Compras (5 lugares): en 375 px cada
  columna mide ~25 px.
- **Grillas fijas** `grid-cols-2` en datos básicos, totales y precios: campos apretados.
- **Filtros**: búsqueda + varios selects en una fila; en el celular ocupan media pantalla antes de
  ver el primer resultado.
- **Encabezados de página**: algunos (`customers`) sin `flex-wrap`, el botón se sale de la pantalla.

---

## Fase 0 — Componentes base (`components/admin/ui/`)

Sin cambios visibles todavía; se crean y se usan a partir de la fase 1.

- [x] `AdminPageHeader` — título, descripción y acciones; en el celular las acciones pasan abajo y
      ocupan el ancho.
- [x] `FormSection` — tarjeta de sección con título, descripción opcional, `id` para anclas y
      opción de plegarse (`collapsible`, con resumen cuando está plegada, ej: "12 atributos cargados").
- [x] `Field` + clases `inputClass` / `selectClass` / `textareaClass` en un solo lugar
      (`components/admin/ui/styles.ts`), con etiqueta, ayuda y mensaje de error.
- [x] `SectionNav` — índice de secciones del formulario: columna fija a la izquierda en
      escritorio, barra horizontal desplazable y pegada arriba en el celular; marca la sección
      visible (IntersectionObserver) y muestra un punto rojo si la sección tiene errores.
- [x] `StickyActionBar` — barra de acciones (Guardar / Cancelar / estado) pegada abajo en el
      celular y arriba en escritorio; indica "Cambios sin guardar".
- [x] `ResponsiveTable` — misma fuente de columnas para tabla (md+) y tarjetas (celular): cada
      columna declara si es título, subtítulo, dato secundario o acción en la tarjeta.
- [x] `FiltersDrawer` — en el celular, los filtros van en un panel desplegable con un botón
      "Filtros (2)"; en escritorio quedan como hoy.
- [ ] `ItemRow` — patrón para filas de ítems editables (producto, cantidad, precio, subtotal,
      quitar): fila en escritorio, tarjeta compacta en el celular. **Pasa a la fase 4**, donde se
      usa; en la fase 1 las filas sólo se apilan en el celular con etiquetas.

## Fase 1 — Layout y arreglos globales de responsive

- [x] `app/admin/layout.tsx`: paddings, ancho máximo de contenido en pantallas grandes, que la
      barra superior del celular no tape contenido.
- [x] `AdminSidebar`: cerrar al navegar, bloquear el scroll del fondo con el menú abierto, zonas
      táctiles de 44 px.
- [x] Todas las tablas dentro de un contenedor con `overflow-x-auto` (arreglo rápido mientras
      llegan las tarjetas de la fase 2).
- [x] Reemplazar `grid-cols-2` / `grid-cols-12` fijos por versiones responsivas
      (`grid-cols-1 sm:grid-cols-2`, etc.) en todos los formularios.
- [x] Encabezados de todas las páginas con `AdminPageHeader`.
- [x] Modales (`QuickProductModal`, `CreateBrandModal`, `DistributorProductSelectorModal`, etc.):
      pantalla completa en el celular, con scroll interno y botones fijos abajo.

**PR 1** = fases 0 + 1.

Notas de la fase 1:
- `main` ya no tiene `overflow-auto` (rompía los `sticky`) y lleva `min-w-0` para que una tabla
  ancha scrollee dentro de su tarjeta en vez de ensanchar la página.
- La barra lateral de escritorio queda pegada (`sticky top-0 h-screen`); en el celular bloquea el
  scroll de fondo y se cierra con Escape.
- Las filas de ítems de Órdenes/Compras no van dentro de un contenedor con scroll horizontal: el
  buscador de productos despliega una lista que quedaría cortada.

## Fase 2 — Listados

Con `ResponsiveTable` + `FiltersDrawer`:

- [x] Productos (`ProductsTable`, `AdminProductFilters`), incluida la edición rápida en el celular.
- [x] Órdenes, Clientes, Categorías, Compras, Presupuestos (`QuotesTable`).
- [x] Comparador (`DistributorsTable`) y Revisión de precios (`PriceReviewTable`: en el celular,
      tarjeta con precio, mejor costo, margen y acción aplicar; sugerencias de vínculo dentro).
- [x] Paginación (`AdminPagination`) compacta en el celular.

**PR 2**.

Notas de la fase 2:
- `ResponsiveTable` dibuja tabla y tarjetas a la vez (una oculta por CSS); lo desplegado
  (`renderExpanded`, ej: edición rápida, sugerencias de vínculo) se monta sólo en el diseño visible
  con `MediaOnly`, para no duplicar estado ni pedidos.
- Columnas con `desktop: false` sólo aparecen en la tarjeta; `variant="bare"` para usarla dentro de
  una tarjeta existente (comparador, revisión de precios).
- `ViewDetailLink`: botón de ícono ver/editar compartido por los listados.

## Fase 3 — Formulario de producto (el más usado)

Orden propuesto de secciones, con `SectionNav` y `StickyActionBar`:

1. **General** — tipo de producto, nombre, SKU/MPN/GTIN, marca, componentes del combo (si es combo).
2. **Precios y stock** — precios (subido desde el final), stock, y el panel de distribuidores con
   el margen.
3. **Descripción** — descripción corta y completa (editor).
4. **Imágenes y categorías** — hoy en la barra lateral.
5. **Atributos** — plegable, con resumen de cuántos están cargados.
6. **Envío**.

En escritorio: índice a la izquierda, contenido al centro y una columna derecha angosta y pegada
con Publicación (estado, destacado) + Guardar. En el celular: índice arriba, Guardar abajo fijo.

- [ ] Partir `ProductForm.tsx` en subcomponentes por sección (`components/admin/products/sections/`)
      sin cambiar el estado ni el envío (el estado sigue en `ProductForm`).
- [ ] Errores de validación: llevar a la sección con error y marcarla en el índice.

**PR 3**.

## Fase 4 — Órdenes, presupuestos y compras

Mismo esquema (índice + barra de acciones), con el resumen de importes siempre visible:
escritorio en la columna derecha pegada; celular en un resumen plegable sobre la barra de acciones
("Total $ 1.234.567 ▲").

- [ ] `OrderForm`: Cliente → Productos (`ItemRow`) → Envío → Pagos → Publicación.
- [ ] `QuoteForm`: Cliente → Ítems (incluye PC armada, `CustomPcQuoteItem`) → Condiciones y
      vigencia → Totales.
- [ ] `PurchaseForm` y `ReceivePurchaseForm`: Proveedor → Ítems → Totales → Estado.
- [ ] `OrderPaymentsSection` e `InventoryAllocationSection` con `ItemRow`.

**PR 4**.

## Fase 5 — Resto de formularios y configuración

- [ ] `CategoryForm`: editor de atributos con cada atributo plegable y reordenable cómodo en táctil.
- [ ] `CustomerForm`, `SupplierForm`.
- [ ] Configuración (`StoreSettingsForm`), Hero (`HeroSlidesManager`), categorías del comparador
      (`ComparatorCategoriesManager`), márgenes (`PricingMarginsForm`).

**PR 5**.

## Fase 6 — Páginas de detalle y dashboard

- [ ] Detalle de orden (`orders/[id]`, 478 líneas), de compra, de cliente y de presupuesto:
      acciones principales arriba y agrupadas, bloques apilados en el celular.
- [ ] Dashboard: tarjetas de métricas en 2 columnas en el celular, gráficos con alto adaptable.

**PR 6**.

## Verificación (en cada PR)

- [ ] `npx tsc --noEmit`, `npm run lint` sin errores nuevos, `npm test`, `npm run build`.
- [ ] Revisión visual en 375 px (celular), 768 px (tablet) y 1280 px (escritorio) de cada
      pantalla tocada, con capturas en el PR.
- [ ] Prueba funcional de lo tocado: crear y editar producto/orden/presupuesto/compra, aplicar
      filtros, paginar, edición rápida.

## Decisiones tomadas (2026-11-16)

1. Formularios largos: **índice de secciones con anclas** (no pestañas).
2. Orden de secciones del producto: el propuesto en la fase 3.
3. Listados en el celular: **tarjetas** (la tabla con scroll horizontal queda sólo como arreglo de la fase 1).
