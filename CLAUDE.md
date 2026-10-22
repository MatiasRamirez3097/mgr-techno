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
- Scripts sueltos en `scripts/` (p. ej. `generateSearchTerms.ts`): se corren con `npx tsx scripts/<archivo>.ts`. Usan el alias `@/` y `connectDB()`, así que requieren `MONGODB_URI` en el entorno.

No hay framework de tests configurado.

## Stack
Next.js 16 (App Router) + React 19, TypeScript, Tailwind 4, MongoDB con Mongoose 9, next-auth v4 (JWT), Zod 4, Zustand (carrito en `store/cart.ts`), Cloudinary (imágenes), Resend (emails), Puppeteer + `@sparticuz/chromium` (PDFs), Recharts, TipTap. Alias de imports: `@/*` → raíz del repo.

## Arquitectura

### Capas
`app/api/**/route.ts` (HTTP, parseo, auth) → `services/<dominio>/*.ts` (reglas de negocio, una función por archivo) → `models/*` (Mongoose). Reglas a respetar:
- Cada handler/servicio llama a `connectDB()` (`lib/mongodb.ts`, conexión cacheada en `global` para serverless).
- Validación de entrada con Zod en `lib/validators/`.
- Conversión de documentos DB a DTO en `lib/mappers/` (`mapXToDTO`). Tipos separados: `types/backend/` (forma en DB) vs `types/shared/` (DTOs que consume el front).
- Las operaciones que tocan stock/pedidos/compras usan transacciones (`mongoose.startSession()` + `withTransaction`): `createOrder`, `createAdminOrder`, `createPurchase`, `receivePurchase`, `allocateInventoryToOrder`.
- Numeración: sólo los documentos genéricos de compras (`CMP-xxxxxxxx`) usan la colección `Counter` (`lib/counters/getNextGenericNumber.ts`). Los presupuestos buscan el último número existente (`generateQuoteNumber`), los comprobantes internos usan `PREFIJO-Date.now()` y los pedidos usan su `_id`.

### Rutas
- `app/(store)/` — tienda pública; `app/admin/` — panel de admin; `app/*.xml/route.ts` — feeds de productos (Google Merchant, HardGamers, BuscaHard, BestGaming) con `revalidate`.
- `proxy.ts` reemplaza a `middleware.ts` (convención de Next 16). Hace tres cosas: devuelve 410 en rutas viejas de WordPress, reescribe a `/mantenimiento` si `MAINTENANCE_MODE=true`, y exige `role === "administrator"` (token next-auth) en `/admin`, `/api/admin/*` y `/api/afip/*`. `/api/webhooks/*` queda excluido del matcher.
- Los redirects SEO desde URLs de WooCommerce (`/product-category/...`, `/product/...`, `/shop/...`) están en `next.config.ts`.
- `instrumentation.ts` setea un proxy HTTP global de undici si existe `PROXY_URL` (lo usa AFIP).

### Stock e inventario
- `Product` tiene tres contadores: `availableStock`, `reservedStock`, `totalStock`. Crear un pedido reserva (available−, reserved+). Asignar inventario (`services/inventory/allocateInventoryToOrder.ts`, sólo pedidos pagados, FIFO sobre `InventoryItem`) descuenta reserved y total, registrando `OrderItemAllocation`.
- Las compras recibidas (`receivePurchase`) generan `InventoryItem` con su costo.
- Productos `type: "bundle"` (combos) tienen stock virtual = mínimo de sus componentes; se recalcula con `services/products/recalculateBundlesStock.ts`.
- Estados de producto: `draft | pending_review | publish | private`.

### Precios
`lib/pricing.ts` centraliza el cálculo: precio final (sale vs regular), precio de lista (+25% recargo) y precio sin IVA (÷1.21). Usarlo en lugar de recalcular en componentes.

### Pagos y pedidos
Checkout (`app/api/checkout`) crea el pedido y la preferencia de Mercado Pago con `external_reference = order._id`. El webhook (`app/api/webhooks/mercadopago`) re-consulta el pago a MP antes de marcar el pedido como `paid`. Al crear pedidos se envía email (`lib/email.ts`) y notificación a Discord (`lib/notifications/discord`).

### Facturación AFIP
`lib/afip/`: `auth/` (WSAA: TRA firmado con node-forge, ticket de acceso cacheado en la colección `AfipToken`), `wsfe/` (armado del request, desglose de IVA, obtención de CAE), `qr/` (QR fiscal). La orquestación está en `services/vouchers/` (validar → generar comprobante → PDF → subir a Cloudinary).

### PDFs
`lib/pdf/`: templates HTML (`templates/`) renderizados con Puppeteer; `browser.ts` usa `@sparticuz/chromium` en Vercel (por eso `serverExternalPackages` y `outputFileTracingIncludes` en `next.config.ts`).

### Distribuidores
`services/distributors/getDistributorProducts.ts` consulta catálogos de mayoristas (Elit, NewBytes, Invid) y normaliza resultados para el comparador del admin; el mapeo de categorías está en `CATEGORY_MAP`.

### Búsqueda
Los productos guardan `searchKey`/`searchTerms` generados por `lib/search/generateProductSearch.ts`. Si cambia la lógica de normalización, hay que regenerarlos con `scripts/generateSearchTerms.ts`.
