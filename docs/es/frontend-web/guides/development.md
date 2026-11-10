# Desarrollo web

## Inicio

```bash
cd frontend-react
npm ci
cp .env.example .env.local
npm run dev
```

La URL y variables públicas se documentan en el ejemplo del módulo. No colocar
secrets en variables `VITE_*`: Vite las incorpora al bundle.

## Modos

```bash
npm run dev        # API real
npm run dev:mock   # MSW/fixtures
```

El mock sirve para UI y contratos controlados; no sustituye pruebas contra el
backend ni PostgreSQL.

## Calidad

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
npm run test:e2e
```

Agregar un flujo requiere page/screen, hook, servicio, cliente/DTO y tests en las
capas correspondientes. Si cambia un contrato backend, actualizar mapper y mocks
en el mismo cambio.

## Contratos y verificación

La portada usa `src/shared/assets/home-hero.webp` (1446 × 1087, aproximadamente
300 KB), derivada del arte original de mobile con `cwebp -q 80 -m 6`. Vite genera
la misma URL con hash para el preload de `index.html` y el componente React:
la descarga empieza antes de montar la app y no se duplica. El recurso también
se comparte con las pantallas de autenticación. `BrandHeroImage` muestra la
imagen completa al terminar la carga; el fondo y el contenido siguen visibles
durante la descarga o ante un error.
Los tests verifican un presupuesto de 350 KB, la coincidencia del preload y
una sola descarga. Esto reduce la primera carga; no elimina la latencia de red.

### Formato de imágenes y fuentes

- Imágenes de UI: WebP. Convertir con `cwebp -q 80 -m 6 origen.png -o destino.webp`
  (agregar `-exact` si tiene transparencia y `-resize <ancho> 0` si se muestra
  más chica que el original).
- PNG sólo donde el cliente no garantiza WebP: correos (`images/email`, y
  `images/brand`, que también usa el correo), vistas previas OG de
  `share-assets`, favicons e iconos y splash nativos.
- Fuentes: WOFF2 con `font-display: swap`. Para convertir un TTF:
  `python3 -m pip install fonttools brotli` y luego
  `python3 -c "from fontTools.ttLib import TTFont; f=TTFont('X.ttf'); f.flavor='woff2'; f.save('X.woff2')"`.
- Todo archivo de `public/` se publica aunque nada lo use. Antes de agregar o
  borrar un archivo, buscar su nombre en el repositorio.

Medición de `npm run build` (#483):

| Recurso | Antes | Después |
|---|---|---|
| Poppins, los 4 pesos que carga cada página | 4 TTF, 624 KB | 4 WOFF2, 203 KB |
| Archivos sin uso en `public/images/illustrations` (4 SVG y 1 PNG) | 6,4 MB publicados | eliminados |
| `dist/` total | 15,5 MB | 9,0 MB |

La página de enlaces compartidos (`share-assets/landing.css`) también usa los WOFF2, así que no queda ningún TTF en `public/fonts`.
`mark.png` (25 KB) y `wordmark.png` (9 KB) siguen en PNG: el correo los usa, y
en WebP ahorran menos de 4 KB.

- [Pruebas y cobertura real](../testing/strategy.md)
- [Configuración, idioma y compatibilidad](../architecture/platform-and-localization.md)

### Errores de autenticación y origen local

Los view models de login, registro y acciones de cuenta usan `presentation/feedback/authErrorMessage.ts` para convertir códigos de aplicación y estados HTTP en mensajes ES/EN. Los textos crudos del transporte no se muestran; los errores originales conservan el diagnóstico. Las restricciones de cuenta y la verificación de correo tienen mensajes específicos. Los detalles de validación sólo se asignan a campos conocidos del formulario con texto localizado.

El proxy de Vite conserva el origen del navegador. El backend exige un origen explícitamente permitido y `X-Vinnot-Web-Session: 1` en `/auth/web/*`. Una vista previa en otro puerto puede recibir `403 Invalid CORS request`, aunque el backend funcione. Para probar autenticación real, usá `http://localhost:3000` (`npm run dev` o `npm run preview -- --port 3000 --strictPort`, sin ejecutar ambos a la vez), o configurá ese origen explícitamente en el backend local. No habilites comodines ni desactives la política de sesión.

Sin backend, el navegador puede observar un fallo de conexión sin estado HTTP; si hay un proxy, éste puede responder con un error de servidor (por ejemplo, 500 en Vite). Un 403 indica rechazo de una petición, no que el servidor esté apagado. Los escenarios se verifican en `tests/e2e/auth-errors.spec.ts`.
