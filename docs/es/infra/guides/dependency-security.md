# Seguridad de dependencias y artefactos

## Alcance y responsabilidad

El workflow reutilizable `security-checks.yml` inspecciona dependencias npm, el
grafo Maven, dependencias nativas Android, historial Git y la imagen candidata del backend. CI lo ejecuta
una vez por pull request o push, con alcance en los grafos de dependencias cuyas entradas cambiaron
(lockfiles, manifiestos, `.npmrc`, manifiestos de backports de seguridad, `pom.xml`, `Dockerfile` y la
configuración nativa mobile); un cambio sólo de código fuente no escanea nada, porque un aviso depende del
grafo resuelto, no del código. Todo pull request hacia `main` escanea todos los grafos, así cada promoción
a producción se contrasta con los avisos publicados desde el último cambio. Los despliegues de
desarrollo dependen del gate completo de ese CI, sin volver a llamarlo. Cuando
se publica backend, la construcción y escaneo de imagen/SBOM se realizan únicamente
en su adaptador, sobre la imagen exacta antes de ECR. PR/main/validación sin deploy
conservan el escaneo de candidata. También admite ejecución manual completa y una revisión semanal los lunes
a las 10:23 UTC en la rama predeterminada. Un fallo del scanner, del registro o
de la resolución de dependencias bloquea el control: no equivale a ausencia de
vulnerabilidades.

El control no recibe secretos de despliegue. Usa permisos `contents: read`,
checkout sin credenciales persistidas y scanners con versión y SHA-256 fijados
en `scripts/install-security-tools.mjs`. Las acciones de seguridad, CI y deploy están
fijadas por commit. Actualizar una herramienta requiere revisar su release,
procedencia y checksum, además de ejecutar los tests de la política.

## Controles por superficie

| Superficie | Fuente inspeccionada | Regla |
|---|---|---|
| Web, mobile y sitio de documentación JavaScript | `package-lock.json`, incluyendo dependencias de desarrollo | `npm audit --audit-level=high`; no se omiten build ni test |
| Backend declarado | `pom.xml` y grafo transitivo resuelto | Trivy, severidad HIGH/CRITICAL |
| Backend empaquetado | Imagen Docker, sistema operativo y JAR incluido | Trivy, severidad HIGH/CRITICAL, con SBOM CycloneDX |
| Android nativo | `releaseRuntimeClasspath` resuelto por Gradle tras Expo prebuild | Trivy sobre `gradle.lockfile`, severidad HIGH/CRITICAL; falla ante dependencias sin resolver |
| Secretos | Historial Git completo | Gitleaks con valores redactados |
| Compatibilidad mobile | Expo Doctor, tests del decoder Metro/PostCSS, exports y preflight iOS | Comprobación de API y build, no sustituto del análisis nativo |

El deploy backend vuelve a escanear **la imagen concreta que publicará**, cargada
localmente con `buildx --load`. Sólo después configura credenciales AWS y envía
los tags `dev-SHA` y `dev-latest`; no reconstruye el artefacto entre scan y push.
El deploy web espera el control de seguridad antes de construir y publicar.
Esto no configura por sí mismo las reglas de protección de ramas de GitHub:
los administradores deben marcar el check como obligatorio donde corresponda.

Antes del scan Maven, `dependency:resolve` resuelve el grafo mediante Maven y
puebla su repositorio local cacheado. Trivy usa ese inventario con `--offline-scan`
para evitar una segunda ráfaga de peticiones POM que pueda activar HTTP 429 en
Maven Central. La resolución sigue siendo obligatoria y falla ante errores;
el modo offline no omite la actualización de la base de vulnerabilidades.

## Mantenimiento compatible

Las bases de build/runtime del Dockerfile están fijadas por digest multiarquitectura.
Actualizar esos digests requiere reconstruir y escanear la imagen; no asumir que
`--pull` actualiza una base fijada. La revisión semanal detecta avisos nuevos,
pero no modifica automáticamente las dependencias ni aprueba excepciones.

- Spring Boot está en la línea 4.1 (Spring Framework 7.0, Tomcat 11, Jackson 3).
  El BOM gestiona las familias de Spring, Tomcat, Jackson, Netty y PostgreSQL.
  Boot 4.1.2 trae Tomcat 11.0.27, Jackson 3.1.7 y Jackson 2.21.7, así que el POM
  ya no los sobrescribe. Si un BOM futuro queda atrás de un parche HIGH/CRITICAL,
  agregar un override de propiedad acotado a la línea gestionada y retirarlo
  cuando el BOM lo incorpore.
- La aplicación usa Jackson 3 (`tools.jackson`) con
  `spring.jackson.use-jackson2-defaults=true`; `JacksonJsonContractTest` fija el
  formato JSON de HTTP. Jackson 2 queda sólo como runtime transitivo de
  `jjwt-jackson` y springdoc/swagger-core; la línea Jackson 2 del BOM (2.21.7)
  mantiene esa familia alineada y corrige CVE-2026-91776 y CVE-2026-91777. No fijar sólo
  `jackson-databind`. Verificar contratos JSON y volver a escanear la imagen al
  actualizar cualquiera de las dos familias.
- Web usa Vitest 5 y su paquete de cobertura en la misma versión exacta. Node
  22 es el runtime de CI; no usar versiones impares de Node para validar el
  release. Los umbrales de cobertura se mantienen en la configuración existente.
- Mobile usa Expo SDK 58 y React Native 0.88 (Metro 0.87, que ya trae el
  decoder de imágenes corregido, por eso se retiró el override de Metro). Los
  overrides están acotados a PostCSS de `@expo/metro-config` y a `zod` dentro de
  `@expo/cli`, alineado con el `zod` corregido de la app. Sus pruebas verifican las llamadas reales de
  Expo/Metro con buffers y archivos, dimensiones y entradas vacías. No aplicar `npm audit fix --force` ni overrides
  globales sin revisar CommonJS/ESM, SDK, plugins y código nativo.
- Android aplica `plugins/withAndroidSecurityDependencies.cjs` durante prebuild.
  Agrega restricciones mínimas de Guava 33.7.2-android, Gson 2.8.9, Commons IO 2.14.0 y los módulos
  `bcutil-jdk15to18`/`bcprov-jdk15to18` de Bouncy Castle 1.86 al proyecto app.
  No agrega bibliotecas ausentes ni fuerza versiones inferiores a las requeridas
  por otro SDK. Revisar y retirar estas restricciones cuando los SDK incorporen
  los parches; mantener alineados los módulos criptográficos. Los tests verifican
  idempotencia, conservación del archivo y rechazo de bloques malformados.
  La variante Android de Guava incluye las correcciones de permisos de archivos
  y directorios temporales, y acota la reserva de memoria (CVE-2026-102554). Un cambio de dependencias nativas requiere reconstruir
  el APK/AAB; una OTA no reemplaza esas clases en el binario instalado. Resolver y
  escanear el grafo de release e identificar el artefacto resultante antes de
  aceptar la actualización.

## Ejecución local

Desde la raíz, con Node 22 o 24 compatible:

```sh
node --test scripts/test/*security*.test.mjs
node scripts/install-security-tools.mjs /tmp/vinnot-security-bin
export PATH="/tmp/vinnot-security-bin:$PATH"
mkdir -p security-reports
(cd frontend-react && npm audit --package-lock-only --include=dev --audit-level=high)
(cd frontend-mobile && npm ci && node scripts/apply-security-backports.mjs --verify)
node scripts/audit-npm-dependencies.mjs frontend-mobile security-reports
(cd docs-site && npm ci && node ../frontend-mobile/scripts/apply-security-backports.mjs --project docs-site --verify)
node scripts/audit-npm-dependencies.mjs docs-site security-reports
gitleaks git --redact --no-banner --log-opts="--all" .
mvn -B -ntp -f backend/pom.xml dependency:resolve
trivy fs --scanners vuln --offline-scan --skip-dirs backend/target --severity HIGH,CRITICAL --exit-code 1 backend
docker build --pull --tag vinnot-security:local backend
trivy image --scanners vuln --severity HIGH,CRITICAL --exit-code 1 vinnot-security:local
trivy image --format cyclonedx --output security-reports/backend.cdx.json vinnot-security:local
```

Instalar con `npm ci` y ejecutar suites, lint, typecheck/build y validación de
arquitectura después de modificar un lockfile. Un escaneo del commit no incluye
automáticamente archivos locales no versionados; revisar también el diff antes
de publicar. `security-reports/` está ignorado y no pertenece a documentación.

## Hallazgos y excepciones

El gate bloquea por defecto y no usa `--ignore-unfixed`, `--vex` ni supresiones.
Reconoce únicamente las correcciones locales de mobile verificadas por hash que se
describen abajo. Un aviso alto/crítico sin parche bloquea hasta resolverlo o hasta
aprobar una excepción explícita mediante revisión. Esa excepción debe identificar
advisory, paquete, versión, ruta/artefacto, precondiciones, evidencia de no
aplicabilidad o mitigación, responsable, issue y vencimiento; nunca excluir una
familia completa. No agregar una excepción sólo para lograr un pipeline verde.

Los antiguos alcances de no afectación de `spring-webmvc@6.2.19` para
CVE-2026-47884 (XSLT) y CVE-2026-47890 (SSE), y su generador, se eliminaron cuando
el backend pasó a Spring Boot 4.1 con Spring Framework 7.0.9 parcheado
(issue #283). Los escaneos de backend corren sin ninguna excepción de aplicabilidad.

Los moderados se conservan en el reporte npm y se evalúan por exposición; el
umbral de bloqueo no los declara inocuos. `.gitleaksignore` contiene únicamente
huellas históricas exactas de ejemplos incompletos, fixtures de tests y texto
documental revisado que activó falsos positivos.
No excluye archivos ni reglas completas. No usar esa lista para una credencial
real: contener, coordinar rotación y revisar alcance antes de continuar.

Los reportes del workflow se guardan 14 días, asociados al run y al intento.
Gitleaks redacta valores tanto en consola como en JSON. El SBOM y los reportes
describen un artefacto y una base de avisos fechados, no una garantía permanente.

Los locks npm usan `source-map-js@1.2.2` y, en mobile, `compression@1.8.2` para
corregir respectivamente GHSA-68fv-2mgg-jv7q y GHSA-vc2v-76pw-4v95 con parches
compatibles. No se amplían las excepciones de backports mobile.

### Correcciones locales verificadas — #177 / PR #178

La excepción de development #175/PR176 fue retirada en #177. El titular solicitó
corregir las dependencias sin romper funcionalidad, antes de promover a producción.
Las versiones oficiales publicadas siguen siendo node-forge 1.4.0 y braces 3.0.3;
no se cambian sus nombres/versiones para engañar al scanner. Se aplican backports
locales de propuestas en los proyectos originales, todavía no releases oficiales:

- [Forge PR1152](https://github.com/digitalbazaar/forge/pull/1152), commit
  `ceba34402e329f0365134f23fe19898756527d65`: valida la cantidad de elementos del
  DigestAlgorithm anidado; corrige el caso GHSA-86w9-cpqp-85rv en el código instalado.
- [Braces PR72](https://github.com/micromatch/braces/pull/72), commit
  `d0d575e55e74a4e0218e5248fafb79efc3e54ebb`: limita a 100 la profundidad de parser y
  walkers (incluidos AST directos); corrige el caso GHSA-vfj7-8cjw-p6xm.

`frontend-mobile/scripts/security-backports/manifest.json` fija versiones, hashes
antes/después, reemplazos y las rutas de los paquetes de propagación conocidos
(seis con Expo SDK 58; sólo braces desde #489, ver abajo).
Se incluyen las licencias originales. `apply-security-backports.mjs` corre en
postinstall de npm ci, valida todo antes de escribir y es idempotente. Un cambio de
versión, código, manifiesto o parche incompleto falla; actualizar exige revisar y
retirar/ajustar el backport. No se agrega dependencia de runtime ni servicio.

El gate conserva intacto el reporte npm: reconoce sólo esas dos raíces si verifica
los archivos instalados y sus hashes. La decisión separada indica corrección local,
`exception: false`; no declara que npm dejó de reportar esas versiones. Cualquier
otro high/critical, ruta/versión nueva, error del scanner o dato inválido bloquea.
Los ciclos de propagación Expo/Metro se recorren una vez por nodo; deben llegar a
una raíz corregida y nunca justifican ignorar otro advisory.

CI instala y verifica estos backports en el job de seguridad, y ejecuta pruebas de
los ataques, firmas válidas, certificados/CSR Expo, globs comunes, idempotencia y
rechazo de código alterado. Se mantiene Expo SDK 58/RN 0.88, Metro 0.87 y todos los gates
existentes. Ninguna de las dos raíces aparece en el sourcemap del export iOS
productivo inspeccionado. Esto no reemplaza validación nativa ni QA de dispositivo.
Retirar los backports y el reconocimiento especial juntos cuando haya releases
oficiales compatibles, después de tests, export y preflight. Seguimiento: #177.

### Backport de node-forge retirado — 1.4.2 (#489)

node-forge 1.4.2 publica la corrección oficial: `rsa.js` vuelve a codificar el
DigestInfo en DER canónico y compara bytes, un control más estricto que el backport
de PR1152. También corrige los once avisos publicados el 27 de octubre de 2026 para
`<=1.4.0` (entre ellos GHSA-5x38-2vff-x55p, GHSA-5cwg-6vw7-rj6p y
GHSA-jc66-7q78-782g). El lock mobile resuelve `node-forge@1.4.2`; los dos paquetes
que lo usan aceptan `^1.4.0`.

La entrada de node-forge, su copia de licencia y sus cuatro paquetes de propagación
salieron del manifiesto mobile, que ahora contiene sólo braces, y el gate ya no
reconoce la raíz node-forge. El vector de falsificación con exponente bajo sigue como
prueba de regresión contra el paquete instalado. El mismo lote sube
`follow-redirects` a 1.16.2 en los tres locks (GHSA-mrwp-f3q8-3g9p) y `joi` a
17.13.9 en docs-site (GHSA-4528-x5fx-h6hg). Con estas actualizaciones de parche, npm
no reporta hallazgos high ni critical en web, mobile ni docs-site.

### Sitio de documentación — #339

`docs-site/` (Docusaurus) pasa por el mismo gate npm que web y mobile. Sus
`overrides` fijan `serialize-javascript@7.1.2` y `tinypool@2.2.0`, versiones
corregidas de dependencias transitivas con avisos críticos en las versiones que
declara Docusaurus 3.10.2. La única raíz high restante es braces 3.0.3, que recibe
el mismo backport [Braces PR72](https://github.com/micromatch/braces/pull/72) que
mobile, byte a byte.

`docs-site/scripts/security-backports/manifest.json` contiene sólo braces y las 31
rutas de los 30 paquetes de propagación del lock de docs-site. Su hash se fija aparte, en
`backportManifestHashes` de `frontend-mobile/scripts/apply-security-backports.mjs`.
El postinstall de docs-site ejecuta ese script con `--project docs-site`. El gate
acepta high en docs-site sólo con la prueba de ese manifiesto: la prueba mobile, la
raíz node-forge o cualquier otra raíz bloquean, y un proyecto sin manifiesto
revisado nunca pasa un high. Al actualizar Docusaurus se revisan los `overrides` y se
retira el backport cuando braces publique una versión corregida.

### Historial: excepción temporal de development — #175 / PR #176 (retirada)

Lo siguiente describe la política anterior; su alcance, vencimiento y bloqueo productivo dejaron de aplicar tras las correcciones verificadas arriba.

El 1 de octubre de 2026 el titular pidió resolver el bloqueo y mergear después de
revisar la propuesta de alcance development. Se acepta riesgo residual de
herramientas; no se declara falso positivo ni dependencia corregida.

- Advisory: [GHSA-86w9-cpqp-85rv / CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv), high, `node-forge@1.4.0`, sin parche oficial publicado al revisar.
- Artefacto: `frontend-mobile`, árbol Git `0bee6731d9de50c23f4c0f3912144245c5345555`; SHA-256 del lock `89b0758e53f392d29483052eae91257d505cff73a0fb075ea22e7e075146beb7`.
- Propagación exacta: `@expo/code-signing-certificates@0.0.6`, `@expo/cli@54.0.27`, `expo@54.0.37`, `expo-updates@29.0.20`; un único nodo conocido por paquete. No se excluyen esas familias de otros avisos.
- Entorno: sólo workflow CI del repositorio, PR #176 desde `bugfix/175-fix-mobile-catalog-pagination-and-refresh-coordination` hacia development o push/dispatch de CI con publicación en development. Otros PR, forks, barrido independiente, main y producción bloquean.
- Responsable: titular de Vinnot; seguimiento vigente y retirada antes de promoción en issue #175. Vence `2026-10-08T23:59:59Z`, inclusive. Cambio del árbol mobile, lock, versión, advisory, severidad o vencimiento invalida la excepción.

La revisión inicial se integró en PR #166. El 1 de octubre de 2026, tras el
pedido del titular de commitear/subir/mergear el seguimiento, se revisó el nuevo
árbol de PR #168: sólo cambia refresco de perfil, presentación de términos,
animación y pruebas mobile; lock, herramientas de firma y configuración de
certificados no cambian. No hay imports de node-forge en el producto. Se reemplaza
el árbol/PR autorizado por los valores exactos nuevos, sin ampliar versiones,
advisories, entornos ni vencimiento. El árbol y PR anteriores ya no califican
bajo esta política; un cambio posterior requiere otra revisión.

El 1 de octubre de 2026, el titular autorizó commitear/subir/mergear el arreglo
local de Metro y delegó el seguimiento de CI. Se revisó el árbol exacto de PR
#169: sólo agrega el adaptador de eventos del watcher, su configuración y pruebas;
no cambia dependencias, lock ni certificados. Los valores vigentes de arriba
reemplazan los de PR #168, sin ampliar el advisory, versiones, entornos ni plazo.
La nueva revisión mantiene Metro 0.83.8 y su parche del decoder de imágenes.

El 2 de octubre de 2026, el titular autorizó commit/push y merge por PR a development del issue #170, incluyendo la revisión de esta excepción temporal vigente. Se revisó el árbol mobile exacto de PR #171: cambia presentación admin, manejo del teclado, mensajes de publicación de reseñas, estado de consultas e invalidación de caché, con pruebas. Dependencias, lock, adaptador Metro, herramientas de firma y configuración de certificados no cambian; no agrega imports de node-forge. El artefacto/PR vigente reemplaza al de PR #169 sin cambiar advisory, versiones, entornos ni vencimiento. Main y producción siguen bloqueados.

El titular autorizó commit/push y merge a development del lote de mails e i18n (#173). La revisión del árbol exacto de PR #174 confirma cambios de presentación, etiquetas, formatos y pruebas; lock, dependencias, watcher/Metro, certificados y configuración Expo no cambian. No agrega imports de node-forge. Los valores vigentes reemplazan el artefacto/PR #171, sin ampliar advisory, versiones, entornos ni vencimiento. La dependencia sigue vulnerable y main/producción siguen bloqueados.

La vulnerabilidad permite falsificar verificaciones RSA PKCS#1 v1.5 con claves de
exponente bajo (e=3). El paquete existe en las herramientas Expo: generación y
validación de certificados/CSR y firma. No se encontraron imports de ese paquete
en `src/` ni configuración `updates.codeSigningCertificate`/`codeSigningMetadata`
en `app.config.ts`; CI exporta JavaScript y no firma una OTA con esos certificados.
Esto limita la exposición observada, pero no demuestra inmunidad de toda la
cadena de herramientas. No aceptar certificados, CSR o firmas externos no
confiables ni usar claves de exponente bajo; usar únicamente material propio
confiable. Esta excepción no autoriza publicar un binario/OTA de producción.

`scripts/audit-npm-dependencies.mjs` conserva el JSON completo de npm y un JSON
de decisión separado, con advertencia explícita. Recorre las causas transitivas:
cualquier raíz high/critical distinta, entrada nueva, dato malformado, error de
scanner o contexto no aprobado falla. Los tests cubren esos rechazos y el
vencimiento; no se oculta el fallo original del run #198. Al existir un parche
oficial compatible, retirar la excepción, actualizar el lock y validar Expo,
configuración, bundle y flujos antes de promover a producción.

## Binarios mobile y aceptación de release

`npm audit` no analiza por sí mismo CocoaPods, Gradle, bibliotecas nativas ni un
IPA/APK/AAB firmado. Para un candidato nativo conservar `Podfile.lock`, el grafo
`releaseRuntimeClasspath`, versiones de plugins, SHA, perfil EAS y fingerprint
del runtime. Relacionar ese inventario con el binario distribuido y revisar los
avisos de los proveedores nativos. El preflight iOS compila sin firma en un
directorio aislado; no consume EAS ni acredita publicación en la tienda.

El job Android usa Ubuntu 24.04, Node 22, JDK 21 y el SDK del runner. Genera el proyecto sin
credenciales de distribución y ejecuta la tarea `vinnotLockReleaseDependencies`
definida en `frontend-mobile/scripts/lock-android-dependencies.gradle`, con
`--write-locks`. La tarea resuelve el grafo completo y rechaza resultados no
resueltos; no interpreta un inventario parcial como seguro. El lock y el reporte
se conservan como artefactos. El proyecto nativo generado y el lock no se
incorporan al repositorio. Este job no compila ni firma un APK/AAB: la aceptación
del binario sigue requiriendo build nativo y pruebas funcionales.

`ios-native-validation.yml` permite validar iOS en un runner limpio macOS 26 con
Xcode 26.6 (Expo SDK 58 exige 26.4 o posterior). Se activa manualmente cuando el workflow existe en la rama
predeterminada, o en un PR al agregar la etiqueta `validate:ios-native`: sólo ese
evento inicia una corrida, así otros eventos del PR y otras etiquetas nunca
generan una corrida macOS omitida. Para validar un commit posterior, quitar y
volver a agregar la etiqueta o lanzar el workflow manualmente; una corrida nueva
cancela una anterior del mismo PR. Consume minutos macOS de GitHub, no cuota de EAS.
No recibe credenciales de distribución. Conserva `Podfile.lock`, reporte de
CocoaPods, log de compilación y SHA-256 del ejecutable Release para iphoneos,
con `CODE_SIGNING_ALLOWED=NO`. No publica ni sustituye pruebas en dispositivos.

Cambios de dependencias nativas/config plugins requieren nuevo build. Los
parches de Metro/PostCSS afectan el bundler; no justifican por sí solos afirmar
que un binario ya instalado está actualizado. Verificar compatibilidad de runtime
antes de decidir entre EAS Update y rebuild. Ejecutar el control de seguridad
antes de una publicación manual también: el workflow no intercepta comandos EAS
ejecutados fuera de GitHub.

El titular autorizó commit/push y merge a development del lote de paginación mobile (#175). La revisión del árbol exacto de PR #176 confirma cambios de coordinación de páginas, refresh/retry, sesión y pruebas; filtros, backend, dependencias, lock, watcher/Metro, certificados y configuración Expo no cambian. El audit conserva el mismo advisory sin parche y su propagación exacta. Los valores vigentes reemplazan PR #174 sin ampliar advisory, versiones, entornos ni vencimiento. Main/producción siguen bloqueados; los tests rechazan el PR y árbol anteriores.
