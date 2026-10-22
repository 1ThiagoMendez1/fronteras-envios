# Mejoras de rendimiento sobre v2.3.1

Base: `d8e2367884c4358ae1ad1ef4337743874c5741ab`. Trabajo preparado en `perf/v231-navigation`; no aplicado a producción. Las mediciones anteriores de main no corresponden a esta versión.

## Resultado medido

| JavaScript necesario | Antes, gzip | Después, gzip | Reducción |
| --- | ---: | ---: | ---: |
| Login | 642.377 bytes | ~183.863 bytes | 71,4% |
| Portada/rastreo | 642.377 bytes | ~242.444 bytes | 62,3% |

Medición reproducible: cierre de imports estáticos de los bundles, sumando cada archivo comprimido con `node:zlib.gzipSync` predeterminado. La base se construyó sin cambios sobre v2.3.1 con configuración desconectada, al igual que el candidato. Se excluyen CSS, imágenes, cabeceras y módulos diferidos que se descargan después por interacción. No es una medición de latencia real ni promete esos porcentajes de mejora en segundos. La versión original genera un JS inicial de ~2,19 MB sin comprimir.

## Cambios

- Las pantallas se descargan bajo demanda. Prefetch por hover/foco únicamente desde enlaces del menú visibles según los permisos existentes.
- Shell persistente entre pantallas privadas: mantiene el estado del menú y evita remontar sus componentes de alertas en cada navegación. Se conservan rutas, permisos y redirecciones existentes, incluidas URLs con slash final.
- Login navega dentro de la SPA después de autenticar, sin recargar todos los assets y restaurar nuevamente la sesión.
- El mapa y sus tiles esperan hasta estar cerca del viewport; se reserva su altura para evitar saltos. Excel se descarga al solicitar plantilla/importación, conservando la biblioteca y las columnas originales.
- La búsqueda de envíos agrupa pulsaciones durante 250 ms y las lecturas anteriores reciben AbortSignal al dejar de usarse.
- `pageSize` forma parte de la clave de caché para separar consultas de 5 y 50 resultados. No se aumentaron TTL de caché ni se desactivó la actualización por invalidación.
- Dashboard y resumen financiero inician sus lecturas independientes en paralelo. Los selects, filtros y cálculos monetarios se conservan. Se reutiliza el formateador monetario.
- Cambio de identidad/logout cancela lecturas y limpia exclusivamente la caché de React Query en memoria. **No borra registros de Supabase.**
- Fallos de descarga de páginas muestran recuperación mediante recarga y permiten seguir usando el menú.

## Seguridad de datos y alcance

No se ejecutaron migraciones, reset, seed, RPC de escritura, borrados ni envíos de WhatsApp. Los archivos de mutaciones de envíos/clientes/conductores/cierres/usuarios y los clientes Supabase permanecen sin cambios. El `dist/` versionado también se conserva: las pruebas generan `.perf-dist/` independiente. El trabajo anterior de main se conserva por separado antes de colocar estos cambios sobre v2.3.1.

Los tests usan usuarios y envíos sintéticos, bloquean todos los WebSockets y toda petición fuera del servidor local salvo las respuestas interceptadas de `review.invalid`. Las únicas peticiones de escritura permitidas por el mock son login/logout sintéticos; cualquier otra escritura aborta y hace fallar el test. No se utilizaron credenciales, sesiones ni registros reales.

## Reproducir

Node 24 recomendado. En la raíz:

```sh
npm ci --ignore-scripts --no-audit --no-fund
# Si no existe Chromium del sistema, instalar el navegador de Playwright:
# npx playwright install chromium
npm run validate:performance
```

`build:review` sobrescribe la configuración de red con dominios `.invalid` y marcadores sin valor real. Compila TypeScript y Vite a `.perf-dist/`. `check:bundle` comprueba presupuestos y la ausencia de mapa/gráficos/Excel en los cierres que no los necesitan. Playwright usa `/usr/bin/chromium` si existe e inicia/cierra preview local en puerto 4180. No ejecutar pruebas históricas de la raíz: algunas consultan servicios reales.

**Resultado final:** instalación congelada, build TypeScript/Vite, presupuestos de bundle y 34 pruebas de navegador aprobados en la carpeta principal, con conexiones de producción bloqueadas.

La suite cubre carga/recarga de diez pantallas con sesión sintética, diez redirecciones sin sesión, permisos de operador, rutas con slash, navegación móvil, layout/prefetch, descarga real de plantilla Excel, mapa diferido, búsqueda agrupada, login sin recarga, limpieza de caché entre sesiones y fallo de un chunk. Las pruebas de dashboard/finanzas retienen respuestas hasta que todas las lecturas hayan comenzado; verifican concurrencia y totales sintéticos sin relajar assertions.

ESLint completo ya falla en la base: 134 errores y 4 advertencias. La revisión de src, tests nuevos y configuración Playwright quedó con 133 errores y 4 advertencias, sin errores en los módulos/tests nuevos. No se desactivaron reglas ni se modificaron las pruebas históricas para ocultarlo. El comando de validación de rendimiento no representa un lint global aprobado.

## Pendiente para producción

Las claves privilegiadas incrustadas en la configuración y en el bundle versionado siguen siendo un problema previo. Este patch no las rota ni sustituye el backend administrativo: hacerlo unilateralmente interrumpiría flujos actuales. Requieren mover operaciones privilegiadas a un backend/Edge Function con autorización y hacer una rotación coordinada. Tampoco se alteraron los borrados no atómicos: deben corregirse con transacciones en un cambio separado, probado con datos sintéticos.

No se instaló Redis: no existe una capa de API propia donde integrar caché compartida de forma segura. Primero hay que resolver autorización y definir agregados de lectura en servidor; después medirlos y aplicar cache-aside con aislamiento por sede/usuario, TTL e invalidación tras commit. Redis no se debe conectar directamente al navegador ni usar como fuente de verdad de cobros/cierres.

Las pruebas desconectadas no verifican RLS real, integridad de datos existentes ni latencia bajo carga de clientes. Se recomienda validar el candidato en un entorno aislado con datos sintéticos antes de publicarlo. No ejecutar migraciones ni importar backups de clientes para habilitar estas mejoras. Un despliegue de frontend no necesita cambios en el esquema de datos; verificar previamente los flujos reales con un procedimiento controlado y acordar reversión a los assets anteriores.
