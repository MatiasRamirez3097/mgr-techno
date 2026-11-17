# Referencias de precio desde una PC

Las tiendas que se usan como referencia de precio (`lib/priceReference/sources.ts`) bloquean las IPs de Vercel (responden 403), así que sus páginas se leen desde una PC con una tarea programada:

1. `upload.ts` le pide al sitio la cola de páginas a leer (`GET /api/cron/price-reference-upload?source=...`), por prioridad: nunca leídas, modificadas según el sitemap, vinculadas con más de 4 h y el resto con más de 24 h.
2. Una vez por día relee el sitemap de la tienda y sube la lista de URLs.
3. Lee hasta 400 páginas por pasada (2 en paralelo, con pausa), extrae los datos del JSON-LD y los sube de a 50 (`POST` a la misma ruta).
4. El sitio guarda todo en `reference_catalog_items` y registra los cambios de precio.

Todos los pedidos al sitio llevan `Authorization: Bearer <PRICE_REFERENCE_TOKEN>`. Si la PC está apagada no se rompe nada: quedan los últimos datos leídos.

## Requisitos de la PC

- Node.js y el repo clonado, con `npm install` hecho.
- En `.env.local`, en la raíz del repo:
  - `PRICE_REFERENCE_TOKEN`: el mismo valor que en Vercel.
  - `PRICE_REFERENCE_URL` (opcional): por defecto, `https://mgrtechno.com.ar/api/cron/price-reference-upload`.

## Configuración en Vercel

1. **Variable de entorno `PRICE_REFERENCE_TOKEN`**: un valor largo y aleatorio, y después un redeploy. Para generarlo en PowerShell:
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```
2. **Excepción en el firewall**: el Security Checkpoint de Vercel frena los pedidos que no vienen de un navegador. En Firewall, regla personalizada con condición Request Path, equals, `/api/cron/price-reference-upload` (o *starts with* `/api/cron/` para cubrir también la de AIR) y acción **Bypass**. El endpoint exige el token, así que la excepción no lo deja abierto.

## Probar a mano

Desde la raíz del repo:

```
npx tsx tools/price-reference-upload/upload.ts
```

La primera vez lee el sitemap (unos 3.000 productos) y después 400 páginas, en unos 5 minutos. Al final imprime algo como `[hardcore] partial: 400 páginas leídas de 400, 2580 pendientes`. Con la tarea cada hora, el catálogo completo queda cargado en unas 8 horas.

Para la **carga inicial** (o después de mucho tiempo con la PC apagada), `--all` encadena pasadas hasta vaciar la cola: unas 3.000 páginas en alrededor de una hora, al mismo ritmo de siempre (2 en paralelo, con pausa).

```
npx tsx tools/price-reference-upload/upload.ts --all
```

Hasta que una página se lee, su producto no aparece en la búsqueda ni en las sugerencias del panel (todavía no tiene nombre ni precio). Si la tarea programada arranca mientras corre `--all`, algunas páginas se leen dos veces: no rompe nada.

## Crear la tarea programada (Windows)

En una terminal, desde la raíz del repo (ajustá la ruta si el repo está en otra carpeta):

```
schtasks /Create /SC HOURLY /TN "MGR Techno - Referencias de precio" /TR "C:\Proyectos\mgr-techno\tools\price-reference-upload\run.cmd" /F
```

- Corre cada hora mientras tu usuario tiene la sesión iniciada (para que corra sin sesión, abrí la tarea en el Programador de tareas y elegí "Ejecutar tanto si el usuario inició sesión como si no").
- El resultado de cada ejecución se agrega a `tools/price-reference-upload/price-reference-upload.log`.
- Para probarla ya: `schtasks /Run /TN "MGR Techno - Referencias de precio"`.
- Para borrarla: `schtasks /Delete /TN "MGR Techno - Referencias de precio" /F`.
