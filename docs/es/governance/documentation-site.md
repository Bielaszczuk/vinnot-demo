# Sitio de documentación

El sitio de documentación publica `docs/es` y `docs/en` como un libro navegable,
con índice lateral, buscador, diagramas Mermaid y el estilo visual de Vinnot. Se
construye con [Docusaurus](https://docusaurus.io/) desde
[`docs-site/`](../../../docs-site/). Los archivos Markdown de `docs/` siguen
siendo la única fuente: el sitio no guarda una copia propia del contenido.

## Cómo lee la documentación

| Idioma | Fuente | Ruta en el sitio |
|---|---|---|
| Español (idioma por defecto) | `docs/es` | `/docs/...` |
| Inglés | `docs/en` | `/en/docs/...` |

Docusaurus lee las traducciones desde
`docs-site/i18n/en/docusaurus-plugin-content-docs/current`.
[`scripts/sync-locales.mjs`](../../../docs-site/scripts/sync-locales.mjs) copia
`docs/en` a esa carpeta antes de `start` y `build`. La copia está ignorada por
Git y se regenera completa en cada ejecución.

Los `.md` se interpretan como CommonMark, igual que en GitHub. Solo un archivo
`.mdx` habilita sintaxis MDX (componentes React dentro del texto).

## Índice lateral

El índice refleja el árbol de carpetas de `docs/<idioma>`: mover un archivo lo
mueve en el libro. [`src/sidebar/chapter-labels.mjs`](../../../docs-site/src/sidebar/chapter-labels.mjs)
aplica tres reglas:

1. Una carpeta con `README.md` toma como nombre el primer título de ese archivo.
2. Una carpeta sin `README.md` usa la traducción de su nombre (`architecture` →
   «Arquitectura»), definida en `folderLabels`.
3. Las páginas de un nivel aparecen antes que sus carpetas, y las carpetas siguen
   el orden de lectura de `folderOrder`, de lo general a lo técnico (manuales,
   módulos, arquitectura, backend, web, móvil, infraestructura…). Las carpetas no
   listadas van al final, en orden alfabético.

## Enlaces

[`src/remark/repo-links.mjs`](../../../docs-site/src/remark/repo-links.mjs)
reescribe los enlaces antes de que Docusaurus los resuelva:

| Destino del enlace en `docs/` | Resultado en el sitio |
|---|---|
| Otra página del mismo idioma | Enlace interno del sitio |
| Archivo o carpeta del repositorio fuera de `docs/` | Archivo en GitHub, rama `development` |
| Página del otro idioma (`../en/...`) | Ruta del otro idioma en el sitio |
| Archivo inexistente | Sin cambios: el build falla |

El build falla ante cualquier enlace roto (`onBrokenLinks` y
`onBrokenMarkdownLinks` en `throw`). La rama de los enlaces a código se cambia
con la variable `DOCS_SOURCE_BRANCH`.

## Estilo visual

- Colores: paleta `wine` de la web
  (`frontend-react/src/shared/assets/styles/tailwind.css`), con modo claro y
  oscuro, en [`src/css/custom.css`](../../../docs-site/src/css/custom.css).
- Tipografía: Poppins, la misma de la web.
- Logo e ícono: `wordmark.png`, `mark.png` y `favicon.png` de
  `frontend-react/public`.
- Portada: [`src/pages/index.tsx`](../../../docs-site/src/pages/index.tsx), con
  una tarjeta por área.

Los textos de la interfaz se escriben en español. Sus traducciones al inglés
viven en `docs-site/i18n/en/` (`code.json` y `docusaurus-theme-classic/`).
`docs-site/i18n/es/code.json` traduce al español los textos del buscador, que el
plugin trae solo en inglés.

## Diagramas a tamaño completo

El sitio deja cada bloque Mermaid como está y, debajo, un enlace abre la versión
a tamaño completo: una imagen con el trazo a mano de Excalidraw y la paleta
`wine`, servida desde `images.vinnot.com`.

```text
[Ver diagrama de «<nombre del diagrama>» completo](https://images.vinnot.com/docs/diagrams/v1/es/<página>-<hash>.svg)
```

- El nombre sale del título que precede al diagrama. Los títulos genéricos como
  "Diagrama" usan el título de la página, y "Arquitectura", "Datos" o
  "Diagrama de casos de uso" lo llevan como prefijo.
- `<página>` es la ruta de la página y `<hash>` los primeros 12 caracteres del
  SHA-256 del código Mermaid. Cambiar un diagrama cambia su dirección: una imagen
  publicada nunca cambia y se puede cachear para siempre.
- Cuando la herramienta cambia cómo se ven diagramas existentes, se agrega una
  entrada a `RENDER_CHANGES` en
  [`scripts/lib/docs-diagrams.mjs`](../../../scripts/lib/docs-diagrams.mjs) que
  indica a qué diagramas afecta. Solo esos cambian de dirección: nadie ve una
  imagen vieja en caché y el resto de las imágenes queda donde estaba.
- [`scripts/check-docs-diagrams.mjs`](../../../scripts/check-docs-diagrams.mjs)
  comprueba que cada bloque tenga su enlace y que coincida con el código actual.
  Lo ejecutan el job `Repository checks` de CI y `node scripts/ci-preflight.mjs`.
- [`tools/docs-diagrams/`](../../../tools/docs-diagrams/) genera y sube las
  imágenes. Es una herramienta de operación fuera de CI, con dependencias
  propias fijadas, y necesita Chrome for Testing (el que instala Playwright, o
  la variable `CHROMIUM_PATH`).

### Después de cambiar un diagrama

Desde la raíz del repositorio, con Node 22:

1. `node scripts/check-docs-diagrams.mjs --write` actualiza los enlaces.
2. `node scripts/docs-diagram-catalog.mjs --write` regenera el [catálogo de diagramas](../diagrams/README.md)
   a partir de los bloques Mermaid; sin `--write` falla si quedó desactualizado.
3. `npm --prefix tools/docs-diagrams ci` instala la herramienta, una sola vez.
4. `node tools/docs-diagrams/generate.mjs` genera las imágenes faltantes en
   `tools/docs-diagrams/out/` (ignorado por Git). `--only <texto>` limita a las
   claves que contienen ese texto, `--force` las vuelve a generar y `--sheets`
   escribe hojas de contacto (`out/sheets/`) para revisarlas de a seis.
5. `npx --prefix tools/docs-diagrams wrangler login`, una sola vez, con una
   cuenta que pueda escribir el bucket `vinnot-catalog-images`.
6. `node tools/docs-diagrams/upload.mjs` sube solo las imágenes que
   `images.vinnot.com` todavía no sirve. `--dry-run` las lista sin subirlas.

Los cronogramas (`gantt`) se dibujan como una grilla de plan de proyecto: columnas de actividad,
inicio y fin, encabezado por mes y semana, una banda de color por sección y rombos para los
hitos.

Cada imagen se genera junto a su escena editable (`.excalidraw`, que queda solo
en `out/`): se puede abrir en <https://excalidraw.com> para ajustarla a mano.

El [Worker de imágenes](../../../infra/cloudflare/catalog-images/worker.mjs)
solo sirve claves `docs/diagrams/v1/<es|en>/<página>-<hash>.svg`, como
`image/svg+xml` con una `Content-Security-Policy` restrictiva (`sandbox`, sin
scripts ni recursos externos) y caché inmutable.

## Comandos

Todos se ejecutan con Node 22 desde la raíz del repositorio:

| Comando | Resultado |
|---|---|
| `npm --prefix docs-site ci` | Instala las dependencias exactas del lockfile |
| `npm --prefix docs-site start` | Servidor local en español con recarga en caliente |
| `npm --prefix docs-site run start:en` | Servidor local en inglés |
| `npm --prefix docs-site run build` | Sitio estático de ambos idiomas en `docs-site/build` |
| `npm --prefix docs-site run serve` | Sirve el build para revisarlo, con cambio de idioma |
| `npm --prefix docs-site test` | Tests de los módulos propios, con cobertura mínima del 100% |
| `npm --prefix docs-site run typecheck` | Verificación de TypeScript |

`start` sirve un solo idioma; para probar el selector de idioma se usa
`build` seguido de `serve`.

## Publicación y acceso

El sitio está publicado en <https://vinnot-docs.pages.dev> y es privado: solo
entran los emails autorizados en Cloudflare Access.

### Cloudflare Pages

El proyecto `vinnot-docs` de Cloudflare Pages está conectado por Git a
`Bielaszczuk/vinnot`. Cloudflare clona el repositorio y construye el sitio en
cada push que modifica `docs/` o `docs-site/`; GitHub Actions no interviene en
la publicación.

| Ajuste | Valor |
|---|---|
| Rama de producción | `main` |
| Directorio raíz | `docs-site` |
| Comando de build | `npm run build` (Cloudflare instala antes con el lockfile) |
| Directorio de salida | `build` |
| Variables | `NODE_VERSION=22`, `DOCS_SITE_URL=https://vinnot-docs.pages.dev` |
| Rutas vigiladas (*Build watch paths*) | `docs/*`, `docs-site/*`; un push que no toca esas rutas no genera build |

- El proyecto `vinnot-dev-web` de Cloudflare Pages, que publicaba la web de
  desarrollo antes de su paso a S3 y CloudFront, tiene los despliegues
  automáticos desactivados desde el 2026-11-06 y no construye en ningún push.
- Un push a `main` publica la versión de producción. Como `main` solo cambia con
  las releases, el sitio muestra la documentación de la última release, no la
  de `development`.
- Un push a cualquier otra rama genera un preview en
  `<rama>.vinnot-docs.pages.dev` y en `<id-del-deploy>.vinnot-docs.pages.dev`.
- Cada build reporta el check `Cloudflare Pages: vinnot-docs` en GitHub.
- Un build que falla no reemplaza la versión publicada. Si falla al clonar el
  repositorio (un error de red, no del código), se reintenta con
  «Retry deployment» en el detalle del deploy.

### Cloudflare Access

Cloudflare Zero Trust (plan Free) protege producción y previews con la
aplicación de Access `vinnot-docs - Cloudflare Pages`, que cubre
`vinnot-docs.pages.dev` y `*.vinnot-docs.pages.dev`. Su política
`Allow Members - Cloudflare Pages` incluye la lista de emails autorizados.

Para entrar, se abre el sitio, se escribe un email autorizado y se ingresa el
código que Access envía a ese email.

Para dar o quitar acceso: Zero Trust → Access controls → Applications →
`vinnot-docs - Cloudflare Pages` → Policies → `Allow Members - Cloudflare Pages`,
y se agrega o se quita el email en la regla Include. Para cortar una sesión ya
abierta, se revoca desde Zero Trust → Team & Resources → Users.

## CI y seguridad de dependencias

El job `Documentation site` del CI instala con `npm ci` y ejecuta tests y
typecheck. Corre cuando cambian `docs/`, `docs-site/`, el script de backports o
los workflows de CI, seguridad y release de producción. No compila el sitio: el
build de ambos idiomas, que falla ante enlaces rotos, lo hace Cloudflare Pages en
cada push y lo reporta como check `Cloudflare Pages: vinnot-docs`, y CI nunca
publica. El gate npm audita `docs-site/package-lock.json` como los de web y mobile;
`node scripts/ci-preflight.mjs` repite en local los mismos pasos y además el build. Ver [CI/CD](../infra/guides/ci-cd.md).

`docs-site/package.json` fuerza en `overrides` las versiones corregidas de
`serialize-javascript` y `tinypool`. braces 3.0.3 no tiene versión corregida
publicada: el `postinstall` le aplica el backport revisado que ya usa mobile, con
su propio manifiesto en `docs-site/scripts/security-backports/`. Detalle en
[Seguridad de dependencias](../infra/guides/dependency-security.md).
