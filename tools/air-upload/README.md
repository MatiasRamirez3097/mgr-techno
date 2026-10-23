# Subida de la lista de AIR desde una PC

La intranet de AIR (`air-intra.com.ar`) no acepta conexiones desde Vercel (connect timeout), así que la lista se descarga desde una PC con una tarea programada y se sube al sitio:

1. `upload.ts` inicia sesión en la intranet con `AIR_USER`/`AIR_PASSWORD` y descarga la lista CSV y `rubros.txt` (`downloadAirFiles` en `services/distributors/air/fetchAirCatalog.ts`).
2. Los manda en base64 a `POST /api/cron/air-import`, con `Authorization: Bearer <AIR_IMPORT_TOKEN>`.
3. El sitio los procesa con `importAirCatalog` y actualiza `air_catalog_items`.

Si la PC está apagada no se rompe nada: queda la última lista subida, y el panel de AIR en el comparador avisa cuando tiene más de 6 horas.

## Requisitos de la PC

- Node.js y el repo clonado, con `npm install` hecho.
- En `.env.local`, en la raíz del repo:
  - `AIR_USER` y `AIR_PASSWORD`: usuario y contraseña de la intranet de AIR.
  - `AIR_IMPORT_TOKEN`: el mismo valor que en Vercel.
  - `AIR_IMPORT_URL` (opcional): por defecto, `https://mgrtechno.com.ar/api/cron/air-import`.

## Configuración en Vercel

1. **Variable de entorno `AIR_IMPORT_TOKEN`**: un valor largo y aleatorio. Para generarlo en PowerShell:
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```
2. **Excepción en el firewall**: el Security Checkpoint de Vercel responde 429 a los pedidos que no vienen de un navegador. En Firewall, creá una regla personalizada:
   - condición: Request Path, equals, `/api/cron/air-import`;
   - acción: **Bypass**.

   El endpoint ya exige el token, así que la excepción no lo deja abierto.

## Probar a mano

Desde la raíz del repo:

```
npx tsx tools/air-upload/upload.ts
```

Si funciona, imprime algo como `Importada: 3025 artículos, 0 con cambio de precio`.

## Crear la tarea programada (Windows)

En una terminal, desde la raíz del repo (ajustá la ruta si el repo está en otra carpeta):

```
schtasks /Create /SC HOURLY /TN "MGR Techno - Lista AIR" /TR "C:\Proyectos\mgr-techno\tools\air-upload\run.cmd" /F
```

- Corre cada hora mientras tu usuario tiene la sesión iniciada. Para que corra aunque no hayas iniciado sesión, abrí la tarea en el Programador de tareas y elegí "Ejecutar tanto si el usuario inició sesión como si no".
- El resultado de cada ejecución se agrega a `tools/air-upload/air-upload.log`.
- Para probarla ya: `schtasks /Run /TN "MGR Techno - Lista AIR"`.
- Para borrarla: `schtasks /Delete /TN "MGR Techno - Lista AIR" /F`.
