# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Reglas de Seguridad y Privacidad
- **Archivos restringidos**: Está estrictamente prohibido intentar leer, modificar, imprimir o inspeccionar archivos `.env`, `.env.*`, claves privadas (`*.key`, `*.pem`, `*.pfx`) o certificados (incluida la carpeta `certs/`).
- Si necesitás verificar qué variables de entorno existen para un módulo, solicitá al usuario los nombres de las variables sin pedir sus valores secretos.

## Qué es el proyecto
MGR Techno: e-commerce + ERP de hardware para Argentina (mgrtechno.com.ar). Tienda pública, panel de administración (productos, pedidos, compras, presupuestos, clientes, comparador de distribuidores), facturación electrónica AFIP, pagos con Mercado Pago y feeds XML para comparadores de precios. Desplegado en Vercel. Código, comentarios y mensajes de error en español.

## Comandos
- `npm run dev` — servidor de desarrollo (http://localhost:3000)
- `npm run build` — build de producción (también sirve como chequeo de tipos)
- `npm run lint` — ESLint (flat config en `eslint.config.mjs`)
- `npx tsc --noEmit` — chequeo de tipos sin build
- `npm test` — tests unitarios con Vitest (`tests/**/*.test.ts`, sin base de datos). Un archivo: `npx vitest run tests/pricing.test.ts`; por nombre: `npx vitest run -t "getShippingModifier"`.
- Scripts sueltos en `scripts/` (carpeta en `.gitignore`): se corren con `npx tsx scripts/<archivo>.ts`. Usan el alias `@/` y `connectDB()`, así que requieren `MONGODB_URI` en el entorno.

El lint del repo ya tiene errores previos (sobre todo `no-explicit-any`); al tocar un archivo, no agregar errores nuevos respecto de `main`.

Documentación funcional y técnica detallada (entidades, flujos, API, deuda técnica pendiente): `docs/DOCUMENTACION.md`.

## Stack
Next.js 16 (App Router) + React 19, TypeScript, Tailwind 4, MongoDB con Mongoose 9, next-auth v4 (JWT), Zod 4, Zustand (carrito en `store/cart.ts`), Cloudinary (imágenes), Resend (emails), Puppeteer + `@sparticuz/chromium` (PDFs), Recharts, TipTap. Alias de imports: `@/*` → raíz del repo.

## Arquitectura

### Capas
`app/api/**/route.ts` (HTTP, parseo, auth) → `services/<dominio>/*.ts` (reglas de negocio, una función por archivo) → `models/*` (Mongoose). Reglas a respetar:
- Cada handler/servicio llama a `connectDB()` (`lib/mongodb.ts`, conexión cacheada en `global` para serverless).
- Validación de entrada con Zod en `lib/validators/`.
- Conversión de documentos DB a DTO en `lib/mappers/` (`mapXToDTO`). Tipos separados: `types/backend/` (forma en DB) vs `types/shared/` (DTOs que consume el front).
- Las operaciones que tocan stock/pedidos/compras usan transacciones (`mongoose.startSession()` + `withTransaction`): `createOrder`, `createAdminOrder`, `createPurchase`, `receivePurchase`, `allocateInventoryToOrder`.
- Numeración correlativa con `getNextSequence(clave)` sobre la colección `Counter` (`lib/counters/getNextGenericNumber.ts`): compras genéricas `CMP-`, presupuestos `PRE-0001-`, comprobantes internos `REC-/FAC-/NC-/ND-`. Los pedidos usan su `_id`.
- Configuración editable desde `/admin/settings` (modelo `StoreSettings`, documento único): en servidor `getStoreSettings()` (sin caché, para que lo cobrado sea lo vigente), en cliente `useStoreSettings()`.

### Rutas
- `app/(store)/` — tienda pública; `app/admin/` — panel de admin; `app/*.xml/route.ts` — feeds de productos (Google Merchant, HardGamers, BuscaHard, BestGaming) con `revalidate`.
- `proxy.ts` reemplaza a `middleware.ts` (convención de Next 16). Hace tres cosas: devuelve 410 en rutas viejas de WordPress, reescribe a `/mantenimiento` si `MAINTENANCE_MODE=true`, y exige `role === "administrator"` (token next-auth) en `/admin`, `/api/admin/*` y `/api/afip/*`. `/api/webhooks/*` y `/api/cron/*` quedan excluidos del matcher (el cron se autentica con `CRON_SECRET`; `/api/cron/air-import`, con `AIR_IMPORT_TOKEN`).
- Los redirects SEO desde URLs de WooCommerce (`/product-category/...`, `/product/...`, `/shop/...`) están en `next.config.ts`.
- `instrumentation.ts` setea un proxy HTTP global de undici si existe `PROXY_URL` (lo usa AFIP).

### Stock e inventario
- `Product` tiene tres contadores: `availableStock`, `reservedStock`, `totalStock`. Crear un pedido reserva (available−, reserved+). Asignar inventario (`services/inventory/allocateInventoryToOrder.ts`, sólo pedidos pagados, FIFO sobre `InventoryItem`) descuenta reserved y total, registrando `OrderItemAllocation`.
- Las compras recibidas (`receivePurchase`) generan `InventoryItem` con su costo.
- Productos `type: "bundle"` (combos) tienen stock virtual = mínimo de sus componentes; se recalcula con `services/products/recalculateBundlesStock.ts`.
- Estados de producto: `draft | pending_review | publish | private`.

### Precios y envío
`lib/pricing.ts` centraliza el cálculo: precio final (sale vs regular), `applyPaymentSurcharge` (recargo de Mercado Pago, % configurable en `StoreSettings`, default 25) y precio sin IVA (÷1.21). `lib/shipping/shippingRules.ts` tiene la regla de envío gratis y el costo de envío local. Front y back deben usar estas funciones; no recalcular en componentes.

### Pagos y pedidos
Checkout (`app/api/checkout`) recotiza en el servidor Andreani/Vía Cargo (el front manda el costo base), crea el pedido y la preferencia de Mercado Pago con `external_reference = order._id`. El webhook (`app/api/webhooks/mercadopago`) valida `x-signature` (`MP_WEBHOOK_SECRET`) y re-consulta el pago a MP antes de marcarlo pagado. El estado de pago se calcula siempre con `services/orders/recalculateOrderPaymentStatus.ts`. Al crear pedidos se envía email (`lib/email.ts`) y notificación a Discord (`lib/notifications/discord`). La conversión de presupuestos delega en `createAdminOrder` (hook `afterCreate` dentro de la transacción).

### Facturación AFIP
`lib/afip/`: `auth/` (WSAA: TRA firmado con node-forge, ticket de acceso cacheado en la colección `AfipToken`), `wsfe/` (armado del request, desglose de IVA, obtención de CAE), `qr/` (QR fiscal), `utils/mapDocumentType.ts` (DocTipo/DocNro, compartido por factura y QR). Punto de venta en `AFIP_POINT_OF_SALE` (`lib/afip/constants.ts`). No loguear sobres SOAP: contienen token y sign. La orquestación está en `services/vouchers/` (validar → generar comprobante → PDF → subir a Cloudinary).

### PDFs
`lib/pdf/`: templates HTML (`templates/`) renderizados con Puppeteer; `browser.ts` usa `@sparticuz/chromium` en Vercel (por eso `serverExternalPackages` y `outputFileTracingIncludes` en `next.config.ts`).

### Distribuidores
`services/distributors/getDistributorProducts.ts` consulta catálogos de mayoristas (Elit, NewBytes, Invid, AIR) y normaliza resultados para el comparador del admin (también lo usa el modal de presupuestos vía `/api/admin/distributors/search`); el mapeo de categorías está en la colección `ComparatorCategory`, editable en `/admin/comparator/categories` (servicios en `services/distributors/categories/`). Invid se consulta desde una copia local en Mongo (`services/distributors/invid/`, sincronizada por su límite de 50 requests/hora), con precios en USD convertidos al dólar oficial BNA (`services/exchangeRates/getUsdExchangeRate.ts`). AIR no tiene API y su intranet no acepta conexiones desde Vercel: una tarea programada en una PC (`tools/air-upload`) inicia sesión, descarga la lista CSV y la sube a `/api/cron/air-import` (`AIR_IMPORT_TOKEN`), que la guarda en otra copia local (`lib/distributors/airMapper.ts` la lee). Las alertas de cambio de costo/dólar en presupuestos se calculan en lectura (`lib/quotes/priceAlerts.ts`).

### Búsqueda
La búsqueda de la tienda usa Atlas Search (`$search`, índice `search_products`) con el texto normalizado por `lib/search/normalize.ts`; la del admin usa regex (`lib/search/adminProductSearch.ts`).

### Feeds
`app/{hardgamers,buscahard,bestgaming}.xml` usan `lib/feeds/buildProductFeed.ts`; `google-merchant-feed.xml` es propio.
