# CI/CD

## Workflows

| Workflow | Trigger principal | Responsabilidad |
|---|---|---|
| `ci.yml` | PR, push a `main`/`development`, manual | Orquesta impacto, validaciones (incluida la política de nombres de rama en PR) y publicación del mismo commit |
| `security-checks.yml` | Reutilizable, manual y semanal | Dependencias npm/Maven/Gradle Android, historial redactado, imagen backend y SBOM; bloquea deploy ante críticos/altos |
| `ios-native-validation.yml` | Manual, o al agregar la etiqueta `validate:ios-native` a un PR | Resuelve/escanea CocoaPods y compila Release iphoneos sin firma en runner macOS; no usa EAS |
| `create-work-branch.yml` | Manual en `main` | Crea/reutiliza issue y crea una rama vinculada |
| `deploy-backend-dev.yml` | Llamada interna desde CI aprobado | Imagen escaneada + ECR + EC2/SSM |
| `deploy-frontend-dev.yml` | Llamada interna desde CI aprobado | Build configurado para dev + S3/CloudFront |
| `production-release.yml` | Manual en `main` | Prepara candidato inmutable, publica o revierte producción tras CI y aprobación del SHA |

## Selección de controles

`scripts/ci-impact.mjs` contiene el mapa de dependencias. No se filtra el workflow
completo por paths: siempre se emite un resultado estable `CI quality gate`.

| Cambio | Validación específica | Publicación automática en development |
|---|---|---|
| `docs/`, `docs-site/` | Documentación, políticas comunes y sitio de documentación (tests y tipos; el build lo hace Cloudflare Pages) | Ninguna |
| `docs-site/package.json`, `package-lock.json` o su manifiesto de backports de seguridad | Lo anterior + audit npm y backports del sitio de documentación | Ninguna |
| README raíz | Documentación y políticas comunes | Ninguna |
| `backend/` (código y tests) | Maven verify y cobertura | Backend; imagen exacta escaneada antes de ECR |
| `backend/pom.xml`, `backend/Dockerfile`, `backend/.dockerignore` | Lo anterior + dependencias Maven y escaneo de la imagen candidata | Backend; imagen exacta escaneada antes de ECR |
| `frontend-react/` | Lint, cobertura y build | Web |
| `frontend-react/package.json`, `package-lock.json` | Lo anterior + audit npm web | Web |
| Pantallas, código TS/JS, assets o mocks de Jest mobile | Doctor, lint, tipos, cobertura y export | Ninguna; no se invoca EAS |
| Configuración/plugins o código nativo mobile | Lo anterior + resolución y escaneo Gradle Android | Ninguna |
| `package.json`, `package-lock.json`, `.npmrc` o backports de seguridad mobile | Lo anterior + audit npm mobile y verificación de backports | Ninguna |
| Scripts de cabeceras/readiness web | Validación web y política de despliegue | Web |
| Compose/script de despliegue backend | Validación backend | Backend |
| Tests backend/web | Su componente y controles comunes | Ninguna por tests |
| Workflows conocidos | Automatización y componentes que valida ese workflow | Ninguna por YAML de CI |
| Renderizador local de diagramas (`tools/docs-diagrams/`) | Sólo políticas comunes: CI no compila nada de ahí | Ninguna |
| Contenido compartido o paths no clasificados | Todos los componentes | Ambos, cuando corresponda publicar |

El `Caddyfile` de `infra/aws-low-cost/` figura entre los archivos de despliegue
backend: `deploy-backend-dev.yml` lo deja en el host y `deploy.sh` lo valida antes
de activarlo; ver [Despliegue](deployment.md).

Documentación, arquitectura, tests de automatización y búsqueda de secretos se
ejecutan siempre, en el job `Repository checks`, junto con el cálculo de impacto y,
en PR, la política de nombres de rama. La búsqueda de secretos conserva el historial completo y
redactado, incluso para cambios de documentación. Las omisiones explícitas de
componentes no afectados no equivalen a omitir estos controles transversales.

En PR se compara desde el merge-base. En push se compara desde el último CI de
push exitoso de la misma rama que sea ancestro del commit actual: ese resultado
incluye los deploys. Así, cambios de un merge fallido, cancelado o todavía en curso
se incluyen en la siguiente ejecución. Renombres se procesan como eliminación y
alta; los paths se separan con NUL. Si falta historial, falla la API o no existe
un baseline válido, se ejecuta el conjunto completo. Un rerun no usa su propio
SHA como baseline. No se reutiliza el verde de otro commit para aprobar el actual.

Hay una excepción para la promoción development → main. Si el merge commit del PR o
el push a `main` tiene exactamente el mismo árbol Git que un commit cuyo CI de push
en `development` fue exitoso, o que el árbol que validó un PR exitoso hacia
`development` (su artifact `ci-validated-tree-<árbol>`, descrito abajo), se omiten
los jobs de componentes: esos bytes ya se compilaron, probaron y escanearon. La
segunda fuente cubre una promoción abierta mientras la pipeline del push a
`development` todavía corre. Sólo cuenta una coincidencia exacta de árbol con un
run completado y exitoso; un run fallido, en curso o de un fork no prueba nada.
`Repository checks` y el quality gate siguen corriendo sobre el SHA actual, que es
lo que verifica el release de producción. Si `main` divergió, el árbol cambia y se
ejecuta todo.

Todo PR hacia `main` además corre Release security sobre todos los grafos de
dependencias (npm de web, mobile y sitio de documentación, Maven, imagen backend y
Gradle Android), aunque su árbol ya esté validado: los avisos se publican sin
cambios de código y la promoción es el último control antes de producción. El push
a `main` posterior al merge no lo repite.

La misma regla cubre el merge de un PR a `development`. Cada CI de un PR hacia
`development` deja un artifact `ci-validated-tree-<árbol>` con el árbol Git exacto
que validó (el merge de prueba de GitHub), retenido 7 días. En el push a
`development`, si el árbol del merge commit coincide con un artifact cuyo run de
`ci.yml` es un `pull_request` del mismo repositorio, completado y exitoso, se omiten
los jobs de componentes y seguridad, y el output `prevalidated` vale `true`. Los
flags de deploy se siguen calculando contra el último push exitoso: los deploys
pendientes corren igual y el backend sigue escaneando la imagen exacta antes de ECR.
Si la base cambió entre el PR y el merge, el árbol difiere. Si el run falló, sigue
en curso, viene de un fork o la API falla, se ejecuta todo el conjunto.

Los pushes siguientes al mismo PR hacia `development` reutilizan la validación por
componente. Cada run deja un artifact `ci-validated-<componente>-<clave>` (retenido 7
días) por cada componente que valida (`backend`, `web`, `mobile`, `docs`). La clave
es un SHA-256 de los objetos Git que lee el job del componente más cada entrada de
primer nivel fuera de las carpetas de componentes (`backend/`, `frontend-react/`,
`frontend-mobile/`, `docs/`, `docs-site/`):

| Componente | Entradas dentro de las carpetas de componentes |
|---|---|
| `backend` | `backend/` |
| `web` | `frontend-react/` y `frontend-mobile/assets/` (los tests web comparan las piezas de marca e ilustraciones con las copias de mobile) |
| `mobile` | `frontend-mobile/` y `docs-site/scripts/security-backports/` (los tests de backports leen el manifiesto fijado del sitio) |
| `docs` | `docs/`, `docs-site/` y `frontend-mobile/scripts/apply-security-backports.mjs` (el sitio instala a través de él) |

Cuando el diff selecciona un componente y un artifact con su clave actual pertenece
a un run `pull_request` de `ci.yml` del mismo repositorio, completado y exitoso, se
omite su job y el componente figura en el output `reused` (`none` si no se reutiliza
nada). Cualquier cambio fuera de las carpetas de componentes (scripts, workflows,
`infra/`, archivos raíz) cambia todas las claves, así que todo componente
seleccionado vuelve a correr; un cambio en las entradas de un componente siempre
ejecuta su job. Un run fallido, cancelado, en curso o de un fork no prueba nada, un
árbol ilegible desactiva la reutilización y una consulta no disponible valida ese
componente. Los escaneos de dependencias y los flags de deploy no se reutilizan. Una
nueva lectura entre componentes debe agregarse a `componentInputs` en
`ci-impact.mjs`.

`content/public-pages.json` y `scripts/sync-public-content.mjs` activan web, mobile y
el deploy web, nunca backend ni trabajo nativo: el texto se genera en ambos clientes.

## Gates

- Seguridad: [dependencias y artefactos](dependency-security.md), llamada una vez por CI con los grafos de dependencias afectados. No recibe credenciales AWS. Un grafo se escanea sólo cuando cambian sus entradas, porque un aviso depende del grafo resuelto y el código fuente nunca lo cambia: el audit npm de cada proyecto sigue su `package.json`, `package-lock.json` y `.npmrc` (más los manifiestos de backports de seguridad de mobile y del sitio de documentación); Maven y la imagen backend candidata siguen `pom.xml`, `Dockerfile` y `.dockerignore`; Gradle Android sigue la configuración nativa mobile (`app.config.ts`, `eas.json`, `plugins/`, `config/`, manifiestos, scripts Gradle y código nativo). Los outputs de impacto son `web_deps`, `mobile_deps`, `docs_deps`, `backend_deps` y `native`. Los PR hacia `main`, el barrido semanal y las ejecuciones manuales escanean todos los grafos. Los cambios en `ci.yml` y `production-release.yml` escanean todos los grafos salvo Android; `security-checks.yml` suma Android. Al publicar dev se escanea siempre, dentro del deploy, la imagen exacta que se envía a ECR; `prepare` escanea la de producción. Si no hay nada que escanear, el job no corre. Los secretos se buscan en `Repository checks`.

- Repository checks: un único job, porque GitHub factura cada job como mínimo un minuto y estos controles duran segundos. Con Node 22 calcula el impacto y valida la política de Actions; en PR del mismo repositorio valida el nombre de la rama con el script del commit base (un `git worktree` del SHA base), así un PR no puede relajar la regla con la que se lo valida; valida estructura bilingüe, índices, enlaces, contenido canónico y enlaces a diagramas; corre los tests de `scripts/test/` excepto el benchmark de imágenes que necesita dependencias mobile; ejecuta `actionlint` y gitleaks con versión/checksum fijados, la validación de arquitectura y la búsqueda de secretos en todo el historial redactado. No usa credenciales reales. Las pruebas de creación de ramas usan una API simulada y verifican ejecución desde la raíz, web, mobile y un directorio temporal ajeno al repositorio.
- Backend: JDK 25, checkstyle, tests, cobertura y build.
- Web: `npm ci`, lint, tests y build.
- Mobile: `npm ci`, expo-doctor mediante `scripts/expo-doctor-check.mjs`, lint, typecheck, tests y verificaciones configuradas. Cuando el único control fallido de expo-doctor es el desfasaje de versiones del Expo SDK ("Check that packages match versions required by installed Expo SDK"), el paso pasa con una anotación de advertencia; el tren nativo mensual alinea esas versiones (ver [Actualización de dependencias](dependency-updates.md)). Cualquier otro control fallido, una caída o una salida que el script no reconoce sigue fallando el paso.
- Sitio de documentación: `npm ci` con el backport de braces verificado, tests con cobertura del 100% y typecheck. El build de ambos idiomas, que falla ante enlaces rotos, lo hace Cloudflare Pages en cada push y lo reporta como check `Cloudflare Pages: vinnot-docs`; CI no lo repite porque nunca publica el sitio. El preflight local sí lo ejecuta. Corre cuando cambian `docs/`, `docs-site/`, el script de backports o los workflows de CI, seguridad y release de producción; nunca publica. Ver [Sitio de documentación](../../governance/documentation-site.md).
- Ramas: `tipo/numero-de-issue-slug`, según la política de work items, validada en `Repository checks`.
- Locks deben estar sincronizados; CI usa instalaciones limpias.

El paso de benchmark dentro de Mobile ejecuta
`wine-label-benchmark.test.mjs`, seguido de la
validación del manifiesto con `VINNOT_SCAN_VALIDATE_ONLY=YES`. Este modo no llama
al proveedor de reconocimiento. Los tests de automatización de GitHub se
reportan en `Repository checks` y resuelven el script bajo prueba desde `import.meta.url`,
sin depender del directorio desde el que se inicia Node. Las pruebas de sesión
del benchmark se ejecutan en automatización, sin duplicarse en Mobile.

`CI quality gate` se ejecuta con `always()` y exige éxito de cada control requerido;
sólo admite `skipped` cuando el mapa declara el componente no afectado. Fallos,
cancelaciones, outputs incompletos y omisiones inesperadas bloquean publicación.
Los controles comunes y de procedencia siguen siendo obligatorios. Seguridad sólo
se espera cuando hay algo que escanear: alguno de `backend_deps`, `native`,
`web_deps`, `mobile_deps` o `docs_deps`. Un escaneo de dependencias nunca exige el
job de su componente, así una promoción que escanea sin revalidar sigue siendo
coherente. Con `prevalidated=true` el gate exige que ningún componente ni escaneo de
dependencias pida validación y admite los deploys pendientes. Un componente listado
en `reused` debe quedar omitido y satisface el flag de deploy que depende de él;
listar un componente que además pide validación, o un valor desconocido, bloquea el
gate. Las condiciones de deploy no dependen de que un job ajeno haya corrido.
Cuando el plan de GitHub admite protección de ramas privadas, seleccionar este
gate y `Repository checks` como checks requeridos. Modificar YAML no cambia
automáticamente esa configuración. En GitHub Free con repositorio privado, el
flujo operativo es abrir PR, comprobar ambos checks en la última revisión y
mergear sólo cuando están aprobados; GitHub no impide un merge manual contrario
a esa política. Los deploys sí dependen técnicamente del gate del mismo commit.

La promoción se realiza mediante PR de `development` a `main`, preservando los
commits con merge commit para mantener la relación entre ambas ramas. Si cambió
la base durante la revisión, actualizar y validar nuevamente la integración antes
de mergear. En `main` se ejecuta CI, pero no se despliega a producción ni se
republica development. Los workflows semanales y manuales quedan disponibles
desde la rama predeterminada; publicar producción requiere su flujo específico.

Los scripts de impacto, decisión del gate, protección de revisión y clasificación de expo-doctor tienen un
umbral del 100% de líneas, ramas y funciones en los tests Node. Incluyen una prueba
con un repositorio Git temporal real y ejecución de los entrypoints CLI; no dependen
solamente de comparar texto YAML. `actionlint` valida los workflows reutilizables,
sus inputs, secretos y referencias entre jobs.

## Publicación y ejecución manual

Los adaptadores de deploy sólo exponen `workflow_call`, no triggers independientes.
CI los llama para un push a development con cambios relevantes. Si ambos componentes
cambian, backend debe terminar antes de web; si sólo cambia web, no espera un deploy
backend innecesario. Web conserva las comprobaciones de contratos de sesión/legal.

Para validar todo manualmente, ejecutar **CI → Run workflow**. Para republicar dev,
seleccionar la rama `development` y activar `deploy_development`. Esta opción
ejecuta todas las pruebas antes de ambos deploys. En otra rama no publica.
No hay un botón de deploy que salte el gate. El despacho manual requiere que el
workflow exista en la rama predeterminada de GitHub.

Un CI exitoso no acredita por sí solo que development esté publicado: comprobar
el resultado de los jobs de deploy esperados y `/api/version` (la web de development no
publica su revisión: la confirma el job `Deploy web development`).
Ambos deploys usan `always()`, rechazan cancelación y exigen el gate exitoso del
mismo commit. Backend puede publicarse aunque web/mobile estén explícitamente
omitidos; web exige éxito u omisión válida de backend. Un componente marcado para
publicación pero omitido sigue siendo un fallo operativo, nunca evidencia de deploy.

Web no repite lint/tests en deploy. Sí compila con las variables y secretos propios
de development: el build de CI valida compilación sin inyectar secretos del entorno.
Backend construye una vez su imagen de publicación, escanea ese mismo objeto,
conserva reporte/SBOM y lo publica sin reconstruirlo. El merge a development no repite la
validación de un árbol idéntico que el PR ya aprobó (ver Selección de controles);
si el árbol difiere, se valida de nuevo.

El flujo y la semántica de cada tipo se detallan en
[Issues, ramas y pull requests](../../governance/github-work-items.md).

## Credenciales

| Entorno | Workflows | Autenticación AWS | Secrets | Variables |
|---|---|---|---|---|
| Development | `ci.yml` → `deploy-backend-dev.yml`, `deploy-frontend-dev.yml` | Claves de acceso IAM estáticas | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | `VITE_GOOGLE_OAUTH_CLIENT_ID`, `VITE_APPLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID` |
| Producción | `production-release.yml` | OIDC (`id-token: write`) con el rol `vinnot-production-release` | `PROD_GOOGLE_MAPS_BROWSER_KEY` | `PROD_GOOGLE_OAUTH_CLIENT_ID` |

Sólo producción usa OIDC. Las claves de development son de larga duración: deben
rotarse y mantenerse acotadas por `infra/aws-low-cost/iam/dev-deployer-boundary.json`.
El boundary no concede lectura de Secrets Manager (el rol de instancia del host lee
`vinnot/dev/backend` mediante `refresh-runtime-env.sh`) ni permisos ECS/RDS retirados.
Editar el archivo no cambia AWS: aplicarlo al usuario deployer es un paso manual
separado y aprobado.
`infra/aws-low-cost/ec2-scheduler-runtime-policy.json` limita el scheduler a
iniciar y detener la instancia de development.
La identidad de deploy no comparte permisos con runtime. Policies extensas se
gestionan como policies administradas, no inline si exceden límites o dificultan
auditoría.

## Concurrencia y fallos

Un commit nuevo cancela validaciones anteriores del mismo PR. En pushes, los jobs
Backend, React Web, Mobile y Release security de una ejecución reemplazada se
cancelan por job; su gate falla y nunca despliega, y el baseline exitoso de la
siguiente ejecución igual incluye sus cambios. Los pushes no cancelan una
publicación activa. Cada adaptador de deploy tiene un grupo de
concurrencia exclusivo de development para evitar superposición sobre su recurso.
Al obtener el turno, antes de usar credenciales AWS, `verify-deploy-revision.mjs`
compara el SHA con la punta remota de development. Una ejecución reemplazada es un
resultado esperado, no un fallo: el script escribe `current=false`, agrega un aviso
"Deployment skipped" y se omiten todos los pasos posteriores de ese deploy, así el
run termina en verde y sólo publica la pipeline más nueva. Ese run sube además el
artifact `deploy-superseded-<backend|web>-<intento>`; `ci-impact.mjs` nunca toma como
baseline un run con esa marca, porque no desplegó sus cambios. Otra ref u otro evento,
o una punta remota ilegible, siguen fallando. Un deploy ya iniciado termina antes del siguiente sobre ese
recurso. No se presupone orden FIFO en la cola de GitHub. El baseline exitoso evita
perder los cambios de ejecuciones reemplazadas o fallidas.

Scripts
usan modo estricto, checksums y parámetros serializados de forma segura. Ante un
fallo remoto, consultar la invocación SSM y logs del container sin reejecutar a
ciegas.

Web/mobile usan cachés npm, backend/seguridad de fuentes usan Maven, y seguridad
nativa Android usa npm y Gradle;
se mantienen instalaciones limpias con lockfiles y los cachés nunca sustituyen
tests ni escaneo. El barrido semanal/manual de seguridad revisa todas
las superficies, aunque no haya commits nuevos, para detectar vulnerabilidades
publicadas después del último cambio. La revisión semanal opera sobre la rama
predeterminada, no sobre todos los entornos desplegados.

Dos cachés evitan repetir trabajo cuyo resultado sólo depende de sus entradas:

- La seguridad Android reutiliza el `gradle.lockfile` de release resuelto para las
  mismas entradas nativas (todo archivo de `frontend-mobile` salvo `src/`, `app/`,
  `assets/`, `__mocks__/` y `scripts/test/`, el mismo alcance que usa la
  clasificación nativa, más `security-checks.yml`) durante la misma
  semana ISO, sin repetir prebuild ni la resolución Gradle. Trivy escanea el
  lockfile en cada ejecución, así que los avisos nuevos siguen bloqueando.
- El deploy de dev y el escaneo de la imagen candidata reutilizan la etapa de
  build Docker del backend (la capa de dependencias de `pom.xml`) mediante
  `actions/cache`, con clave sobre `pom.xml`, `Dockerfile` y `.dockerignore`. Sólo
  se cachea la etapa de build: la etapa runtime y sus paquetes del sistema operativo
  se reconstruyen siempre.

Los barridos semanales/manuales resuelven el grafo Android y construyen la imagen
desde cero, y sólo siembran esos cachés. El build `prepare` de producción usa
`docker build --pull` sin caché.

## Mantenimiento

Linux usa `ubuntu-24.04` y las Actions JavaScript usan Node 24 con SHA completo.
`infra/security/actions-policy.json` registra los metadatos revisados;
`verify-workflow-policy.mjs` rechaza tags mutables, runners `*-latest`, runtimes
ajenos a la revisión e inputs no admitidos. `--online` contrasta cada SHA contra
el `action.yml` oficial. No basta cambiar el comentario de versión ni silenciar
una advertencia. Revisar permisos y metadatos antes de actualizar el catálogo.

### Estrategia local antes de pushear

Cada falla en Actions cuesta minutos y un rerun. Antes de cada push o dispatch,
con Node 22 y dependencias locales disponibles, correr el preflight:

```sh
node scripts/ci-preflight.mjs origin/development        # rama de trabajo → development
node scripts/ci-preflight.mjs origin/main               # PR de release development → main
node scripts/ci-preflight.mjs origin/development --all  # todos los componentes
node scripts/production-component-plan.mjs --inspect "$(git rev-parse origin/main)"
```

El preflight calcula el impacto del diff con el mismo `ci-impact.mjs` que CI y
ejecuta, en el orden de CI, todo lo que aplica:

| Impacto | Controles |
|---|---|
| Siempre | Nombre de rama, política de Actions (`--online`), actionlint, tests de automatización con cobertura del 100%, documentación y diagramas, arquitectura de tests, gitleaks sobre los commits que no están en la base y sobre los cambios sin commitear |
| Backend | `mvn clean install` (incluye `verify`: checkstyle, tests, cobertura y empaquetado) |
| Entradas de la imagen backend | Resolución Maven y trivy del grafo; build de la imagen con Docker y trivy de la imagen |
| Web | `npm ci`, audit npm, lint, cobertura, build y retención/rollback en Chromium |
| Mobile | `npm ci`, backports de seguridad, audit npm, expo-doctor (el desfasaje de versiones advierte, otros fallos bloquean), configuración de release, lint, tipos, cobertura, export iOS y benchmark sin solicitudes pagas |
| Configuración nativa mobile | En macOS, `npm run preflight:ios:native` con valores de producción: prebuild, `pod install` y compilación iphoneos que incluye el módulo OCR exclusivo de dispositivos y la configuración de Maps iOS de producción |
| Docs | `npm ci`, backports de seguridad, audit npm, tests, tipos y build de ambos idiomas |

El primer fallo corta la ejecución; al terminar muestra el tiempo de cada control.
Un cambio nativo Android avisa que su resolución Gradle sigue siendo un control de
CI. CI compila iOS sólo cuando se agrega la etiqueta `validate:ios-native` a un PR
(o con ejecución manual); los commits posteriores no se recompilan hasta quitar y
volver a agregar la etiqueta, así que un
cambio nativo se compila en local antes de llegar a git; fuera de macOS el
preflight avisa que hay que ejecutarlo en una Mac antes del push. No hace push, no envía correo, no cambia AWS ni inicia Actions. Ejecutarlo en
un checkout limpio de los archivos que se van a entregar, sin reinstalar
dependencias bajo un Metro que el usuario tenga activo. Ninguna prueba local
garantiza la disponibilidad futura de un proveedor externo.

Hook opcional por clon: `git config core.hooksPath .githooks` activa
`.githooks/pre-push`, que corre el preflight contra `origin/main` cuando el push
apunta a `main` y contra `origin/development` en los demás casos. Para saltearlo
una vez: `VINNOT_SKIP_PREFLIGHT=1 git push` o `git push --no-verify`.

### Minutos de Actions

GitHub factura cada job redondeando hacia arriba al minuto, y macOS cuenta diez
veces. Un job omitido no se factura. Por eso los controles cortos comparten
`Repository checks`, el gate es el único otro job fijo, el merge a development no
repite un árbol ya validado, una promoción a `main` acepta el árbol que ya validó
su PR, los escaneos de dependencias corren sólo cuando cambian sus entradas, un
deploy de development reemplazado se omite en vez de fallar, la validación nativa
iOS arranca sólo al agregar su etiqueta y el build del sitio de documentación queda en
Cloudflare Pages. Para recuperar un job interrumpido, usar `gh run rerun --failed`,
nunca el run completo.

CI valida la política de Actions en Repository checks y espera ese job
antes de arrancar Maven, frontends y seguridad costosa. `github-read.mjs` admite
hasta tres intentos exclusivamente para GET transitorios (socket/timeout,
429/502/503/504); 401/403/404, datos inválidos y escrituras de deploy no se reintentan.
Un fallo SSM requiere inspección antes de repetir la publicación. No volver a
lanzar una pipeline completa para recuperar un único job interrumpido.

Conservar el barrido semanal de seguridad. Revisar avisos nuevos en cada entrega,
actualizar Actions/runtimes antes de su retiro y registrar las comprobaciones.
Dependabot abre un PR mensual agrupado hacia `development` para las Actions fijadas;
su primera ejecución se detiene en `Repository checks` (cerca de un minuto, antes de
cualquier job de componente) hasta que un commit revisado registra el nuevo SHA,
runtime e inputs en `infra/security/actions-policy.json`. El error nombra la Action y
el paso a seguir. También abre un PR mensual agrupado patch/minor por cada proyecto npm, Maven
y Docker; ver [Actualización de dependencias](dependency-updates.md);
no habilitar builds repetitivos para aparentar mantenimiento. Sólo un árbol Git
idéntico ya aprobado evita repetir la validación; nunca se traslada el verde de otro árbol.

La revisión del 2026-10-06 eliminó los avisos de Actions Node 20, runner flotante
e inputs AWS no admitidos. Vite usa configuración ESM nativa y jsdom 27.4 elimina
`whatwg-encoding` del testing web; los tests mobile usan los matchers de RNTL.
Persisten avisos transitivos en Expo/Jest/MLKit (glob, inflight, rimraf, uuid,
jsdom 20 y jest-native que MLKit todavía declara) y avisos Java/Mockito/Spring
durante pruebas. No son excepciones de seguridad ni están silenciados: mantener
su actualización compatible como trabajo pendiente en #217, verificar el árbol
con `npm explain` y no forzar overrides de APIs incompatibles. El preflight y CI
siguen bloqueando hallazgos altos/críticos no remediados; los backports se
verifican contra versión, path y advisory exactos.

## Candidato y publicación productiva

`production-release.yml` sólo se inicia manualmente desde `main`. El operador
indica su SHA completo actual. `prepare` comprueba un run exitoso de `ci.yml`
de esa revisión, repositorio/origen, rama, evento y jobs del intento exitoso;
reutiliza el gate existente. Con `baseline_candidate_run_id`, descarga un candidato
anterior completo, comprueba su procedencia/CI/checksums y que sea ancestro.
Compara los cambios de artefactos: construye sólo backend/web modificados y
reutiliza los bytes verificados del otro componente. Comprueba también su revisión
actual en producción antes de conservarlo. Sin baseline verificable se construyen
ambos; un baseline proporcionado inválido bloquea la operación. `force_rebuild`
permite reconstruir después de cambiar variables/secretos de build fuera de Git.

El manifiesto formato 2 conserva revisión operadora y revisión propia de cada
componente, flags de publicación, imagen AMD64 identificada mediante label OCI,
tar, SBOM, informes y web completa para rollback; checksums cubren todo el
artefacto durante 30 días. El formato 1 anterior sigue siendo válido. No obtiene
credenciales AWS en prepare. La inspección local previa indica si hace falta este
workflow: para una entrega exclusivamente mobile, publicar OTA compatible sin
preparar ni publicar backend/web cuando ambos están sin cambios.

`publish` descarga el candidato por run, valida procedencia e inventario completo
antes de asumir el rol OIDC productivo y no vuelve a construir. Verifica que la
imagen publicada en ECR tenga el mismo ID y label del componente. Sólo el backend
modificado se envía a SSM por digest; sólo web modificada se publica/invalida,
después del éxito del host si hubo deploy backend. El componente conservado se
revalida antes de obtener credenciales y antes de cambiar web. Si ambos están
sin cambios, no se asume el rol AWS ni se escriben recursos. Por eso `/version`
y la meta revision web pueden conservar SHAs diferentes de la revisión operadora.
`rollback` restaura ambas partes del candidato completo, sin depender de sus flags
originales; omite una parte que ya esté en la revisión objetivo para no revertir
su historia dos veces. Acepta un candidato anterior conservado;
el host exige que coincida con la release previa registrada y su esquema/configuración.
Ambas acciones vuelven a comprobar que la revisión operadora de `main` siga vigente.
Una ejecución conserva `deployment-result.json` sin secretos; el estado publicado
requiere después aceptación de navegador desde la IP habilitada.

GitHub Free privado no ofrece environments protegidos ni aprobación obligatoria.
La aprobación humana, revisión de cambios a workflows y dispatch explícito son
controles operativos; no impiden que alguien con capacidad de modificar `main`
cambie el flujo. El rol separado limita recursos y usa el `sub` exacto observado
para el repositorio/ref, incluido el formato de IDs inmutables si está habilitado.
No se debe conceder producción al deployer de development.

Los artefactos expirados no se reconstruyen bajo la identidad de una release
anterior: preparar un nuevo candidato o recuperar una copia íntegra verificada.
El borrado de assets/archivos de releases no forma parte del deploy; la limpieza
requiere inventario, ventana mínima de 30 días y preservar releases activa/previa.

El generador local `optimize-static-artwork.py` valida web y mobile sin resolver dependencias nativas; `preview_transactional_emails.py` valida backend. Los scripts por sí solos no publican artefactos: los archivos generados versionados determinan los despliegues correspondientes.
