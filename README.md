# Contax — Gestor de Inventario y Ventas

PWA para control de stock, ventas y ganancias. Funciona 100% offline: cada usuario guarda sus propios datos localmente en su dispositivo (no hay backend compartido todavía).

## Stack

- React 18 + Vite 5
- IndexedDB / localStorage (persistencia local, por dispositivo)
- `vite-plugin-pwa` (Service Worker + manifest generados automáticamente)
- Deploy en Vercel

## Funcionamiento offline

La app se puede instalar como PWA y usar sin conexión a internet:

- **Datos**: se guardan en IndexedDB/localStorage del navegador. Cada usuario que entra desde el link de Vercel tiene su propia base de datos local, aislada — no hay sincronización entre dispositivos ni entre usuarios.
- **Assets** (HTML/CSS/JS/íconos): se cachean con un Service Worker generado por `vite-plugin-pwa`, así la app carga sin conexión una vez que se abrió al menos una vez con internet.

### Cómo se generan el Service Worker y el manifest

Antes, `sw.js` y `manifest.json` se mantenían escritos a mano en la raíz del proyecto. Esto se rompió al migrar a Vite, porque el build genera archivos con nombres hasheados (`index-a1b2c3.js`) que el `sw.js` manual no podía predecir — la instalación del Service Worker fallaba silenciosamente.

Ahora se usa `vite-plugin-pwa` con estrategia `generateSW`: el Service Worker y el manifest se generan automáticamente en cada `npm run build`, ya con los nombres de archivo reales. La configuración vive en `vite.config.js`.

**Importante:** ya no hay que tocar `sw.js` ni `manifest.json` a mano — ambos se generan en `dist/` durante el build y no se versionan en el repo.

### Actualización de versión

Con `registerType: 'autoUpdate'`, el Service Worker se actualiza solo en segundo plano la próxima vez que el usuario abre la app con internet. No queda gente trabada con una versión vieja.

## Cómo probar el modo offline localmente

```bash
npm run build
npm run preview
```

Abrir `http://localhost:4173`, ir a DevTools → **Aplicación → Service Workers**, tildar **"Sin conexión"** y recargar. La app tiene que seguir funcionando con los datos ya cargados.

## Chunks / rendimiento

El build separa las librerías pesadas (`react`, `jspdf`, `recharts`, `lucide-react`) en chunks propios (`manualChunks` en `vite.config.js`). Esto evita un único archivo JS de más de 1MB y hace que, si se actualiza solo el código propio, el usuario no tenga que volver a descargar esas librerías.

## Utilidades compartidas

- `src/utils/format.js` — `formatMoney(value)`: formato de moneda único para toda la app (separador de miles, 2 decimales fijos, ej. `15.000,00`). Todas las pantallas que muestran precios (Vender, Productos, Dashboard, Analytics, Sectores, ProductModal, SaleModal) usan esta misma función en vez de `toFixed(2)` suelto, para que el formato no varíe de una pantalla a otra.
- `src/utils/businessTypes.js` — catálogo de rubros de negocio y sus campos extra (talle/color para ropa, volumen para perfumería, etc.), más soporte de campos personalizados por el usuario.
- `src/utils/pdfGenerator.js` — generación de PDFs (lista de compras, vencimientos, inventario valorado, cierre de ventas).
- `src/utils/db.js` — capa de persistencia (IndexedDB/localStorage).

## Pendiente / conocido

- **Notificaciones push de stock bajo y sync de ventas**: existían en el `sw.js` manual anterior. Se perdieron al migrar a `generateSW`, porque esa estrategia no soporta código custom del Service Worker. Para recuperarlas hay que migrar a la estrategia `injectManifest` de `vite-plugin-pwa`, y además necesitan un backend (Supabase) que dispare el push — no alcanza con el frontend solo.
- **Ícono maskable**: el manifest declara íconos con `purpose: 'maskable'` reusando los archivos normales (`icon-192.png`, `icon-512.png`). Si el logo no tiene margen alrededor, Android puede recortarlo al aplicar la máscara. Ideal: diseñar un ícono aparte con ~20% de margen de seguridad.
- **Manejo de errores de sincronización**: cuando se conecte un backend (Supabase), falta definir qué le muestra la app al usuario si intenta sincronizar sin conexión (mensaje tipo "se sincronizará cuando vuelva la conexión").
- **Archivos legacy de PWA sin borrar**: todavía quedan `public/manifest.json` y `public/sw.js` escritos a mano de antes de migrar a `vite-plugin-pwa`. Según lo explicado arriba, ya no hacen falta (el plugin genera sus propios archivos en `dist/` durante el build) y pueden pisar la salida generada — hay que eliminarlos de `public/`.
- **Escaneo de código de barras real**: hoy en Vender, el "escáner" es un input de texto manual (`showScanSimulator`) donde se tipea el SKU a mano. Integrar una librería de lectura por cámara (ej. `@zxing/library` o `html5-qrcode`) agilizaría la venta en mostrador.
