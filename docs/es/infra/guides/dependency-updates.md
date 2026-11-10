# Actualización de dependencias

## Propósito y alcance

Esta guía mantiene las dependencias al día. Las vulnerabilidades son un tema
aparte, cubierto por [Seguridad de dependencias y artefactos](dependency-security.md):
un paquete puede no tener avisos de seguridad y aun así bloquear el trabajo por
estar desactualizado, como cuando Expo SDK 54 no encontraba la app Simulator que
Xcode 27 reemplazó por DeviceHub.

Dos mecanismos cubren la actualización:

| Mecanismo | Fuente | Qué hace |
|---|---|---|
| Dependabot | [`.github/dependabot.yml`](../../../../.github/dependabot.yml) | Abre pull requests de actualización agrupados hacia `development` |
| Reporte de actualización | [`scripts/dependency-report.mjs`](../../../../scripts/dependency-report.mjs) | Lista paquetes desactualizados, la alineación con el SDK de Expo y el fin de soporte de las plataformas, en local |

Ninguno de los dos mergea nada. Cada actualización pasa por el flujo normal de
pull request, CI y release.

## Niveles de actualización

| Nivel | Ejemplos | Frecuencia | Camino |
|---|---|---|---|
| Seguridad | Hallazgos HIGH/CRITICAL de Trivy o `npm audit` | Inmediata | [Seguridad de dependencias y artefactos](dependency-security.md) |
| Rutina | Actualizaciones patch y minor de librerías | Mensual | Un pull request agrupado de Dependabot por proyecto |
| Plataforma | Actualizaciones major, la familia del SDK de Expo, React Native, Spring Boot, Java, Node.js, PostgreSQL | Revisión trimestral | Un work item planificado, con build nativa cuando cambia mobile |

Regla de plataforma: estar como máximo una versión major detrás de la más
nueva, y salir de un ciclo de versiones antes de su fin de soporte.

## Configuración de Dependabot

| Ecosistema | Directorios | Frecuencia |
|---|---|---|
| `github-actions` | `/` | Mensual, un solo pull request agrupado; cada actualización necesita un commit revisado en `infra/security/actions-policy.json` |
| `npm` | `/frontend-mobile`, `/frontend-react`, `/docs-site`, `/tools/docs-diagrams` | Mensual |
| `maven` | `/backend` | Mensual |
| `docker` | `/backend` (`Dockerfile`) | Mensual; la imagen de build `maven` no propone cambios de tag |
| `docker-compose` | `/infra`, `/infra/aws-low-cost` | Mensual |

Cada entrada mensual:

- agrupa todas las actualizaciones patch y minor del proyecto en un solo pull
  request, de modo que cada proyecto recibe como máximo un pull request de
  actualización de versiones por mes (las actualizaciones de seguridad van aparte);
- ignora las actualizaciones major (`version-update:semver-major`), que
  pertenecen al nivel de plataforma;
- aplica una espera de 7 días, así se omiten las versiones con menos de una semana;
- usa el prefijo de commit `chore(deps)` y apunta a `development`.

`frontend-mobile` además ignora los paquetes que fija el SDK de Expo: `expo`,
`expo-*`, `@expo/*`, `react`, `react-dom`, `react-native`, `react-native-*`,
`@react-native/*`, `@react-native-async-storage/*`, `@react-native-community/*`,
`@react-navigation/*`, `@shopify/flash-list`, `jest-expo`, `babel-preset-expo`,
`typescript` y `@types/react`. Se actualizan juntos con `npx expo install --fix`
dentro de una actualización de SDK, nunca de a uno.

Python no tiene entrada en Dependabot: `scripts/wine-images` fija sus versiones
en `requirements.lock`, y el soporte pip de Dependabot solo lee archivos `.txt` y
`pyproject.toml` PEP 621, cuyos rangos ya permiten todos los patch y minor. El
reporte de actualización compara ese lock con PyPI.

Las imágenes base del Dockerfile siguen fijadas por digest; Dependabot actualiza
el tag y el digest juntos, y CI reconstruye y escanea la imagen.

El tag de la imagen de build `maven` incluye el JDK (`3.9-eclipse-temurin-25`), y
Dependabot interpreta un salto de JDK como `-25` a `-26` como una actualización
patch. Por eso la entrada `docker` ignora toda actualización de versión de `maven`
(major, minor y patch). El JDK es una actualización de plataforma: se mueve junto
con `java.version` en `pom.xml`, la configuración de Java en CI y la imagen de
runtime `eclipse-temurin`, cuyas majors ya ignora la regla `*`.

## Actualización de Actions fijadas

Los workflows fijan cada Action a un SHA de commit completo, y
`infra/security/actions-policy.json` registra el SHA, el runtime y los inputs
revisados de cada Action. `scripts/verify-workflow-policy.mjs` rechaza cualquier
SHA que la política no liste, así que el pull request mensual de Actions de
Dependabot falla su primera ejecución en `Repository checks`. Ese job falla en
cerca de un minuto y no arranca ningún job de componente. El error nombra la
Action, el SHA nuevo y el paso a seguir.

La política es el paso de revisión y no se aprueba automáticamente: un SHA de
commit también puede resolver a un commit de un fork del repositorio de la Action,
y una versión nueva puede cambiar su runtime o sus inputs. Para cada pull request
agrupado de Actions:

1. Leer las notas de versión y el diff de `action.yml` de cada Action actualizada.
2. Registrar el `sha` nuevo (y cualquier cambio de runtime o inputs) en
   `infra/security/actions-policy.json`, en un commit sobre la rama de Dependabot.
3. Ejecutar `node scripts/verify-workflow-policy.mjs --online` en local; compara
   cada SHA registrado con el `action.yml` oficial (runtime Node 24 e inputs).
4. Hacer push del commit; CI corre entonces con normalidad.

Una Action nueva, que la política nunca listó, sigue la misma revisión y nunca se
acepta sin ella.

## Desfasaje de versiones del SDK de Expo

Expo publica versiones patch del SDK entre las builds nativas de la app. El control
"Check that packages match versions required by installed Expo SDK" de expo-doctor
falla entonces hasta alinear los paquetes, lo que obligaría a actualizar, subir la
versión y generar builds nuevas para las tiendas en cualquier momento. CI y el
preflight local ejecutan expo-doctor mediante
[`scripts/expo-doctor-check.mjs`](../../../../scripts/expo-doctor-check.mjs):

- cuando el desfasaje de versiones es el único control fallido, el paso pasa y
  muestra una advertencia (una anotación en GitHub Actions);
- cualquier otro control fallido, una caída o una salida que el script no reconoce
  hace fallar el paso, como antes.

Las actualizaciones de dependencias nativas salen juntas en el tren nativo
mensual: `npx expo install --fix`, el manifiesto de backports de seguridad, la
subida de versión y ambas builds para las tiendas. Entre trenes, los arreglos sólo
de JavaScript salen por OTA, y los arreglos de seguridad nativos (hallazgos de npm
audit, Gradle Android o CocoaPods) siguen bloqueando CI y salen fuera del tren.

Las actualizaciones npm de mobile siguen pasando por los backports de seguridad
revisados: subir un paquete con backport hace fallar
`apply-security-backports.mjs --verify` hasta revisar su manifiesto.

[`scripts/test/dependabot-policy.test.mjs`](../../../../scripts/test/dependabot-policy.test.mjs)
falla cuando un manifiesto pierde su entrada, cuando aparece una entrada `pip`, cuando una entrada (Actions
incluida) deja de ser mensual o agrupada, cuando una entrada mensual empieza a permitir majors, cuando un
paquete del SDK de Expo deja de estar ignorado o cuando la imagen de build `maven` vuelve a poder proponer un
cambio de tag.

## Reporte de actualización

Se ejecuta desde la raíz del repositorio después de `npm ci` en cada proyecto npm:

```bash
node scripts/dependency-report.mjs --output outputs/dependency-report.md
```

Sin `--output` imprime Markdown por la salida estándar. Corre en la máquina del
desarrollador, así que no consume minutos de GitHub Actions. Necesita acceso de
red al registro de npm, Maven Central, PyPI y endoflife.date, y `npm`, `npx` y
`mvn` en el `PATH`.

| Sección | Comando o fuente | Muestra |
|---|---|---|
| npm por proyecto | `npm outdated --json` | Versión actual y más nueva, con el salto major/minor/patch |
| SDK de Expo | `npx expo install --check` | Paquetes que no coinciden con el SDK instalado, y cuántos SDK de atraso hay |
| Maven | `versions-maven-plugin` 2.18.0: actualizaciones del parent, de las dependencias declaradas y de las propiedades de versión | Se ignoran las pre-releases; las entradas del BOM de Spring Boot quedan cubiertas por la actualización del parent |
| Python | `requirements.lock` y `pyproject.toml` contra PyPI | Versiones fijadas con una versión más nueva, y versiones por encima del límite superior declarado |
| Plataformas | endoflife.date para Node.js (`frontend-mobile/.nvmrc`), Eclipse Temurin (`java.version`), Spring Boot (parent) y PostgreSQL (`infra/aws-low-cost/compose.postgres.yml`, luego `infra/docker-compose.yml`) | Fecha de fin de soporte, días restantes, ciclo más nuevo y LTS más nuevo |

Según semver, una versión minor `0.x` cuenta como salto major. Un ciclo a 180
días o menos de su fin de soporte figura como `ends soon`.

Una herramienta que falla se convierte en la línea `Could not check` de su
sección; el resto del reporte sigue corriendo. Un proyecto sin `node_modules`
indica que hace falta `npm ci` en lugar de listar todos sus paquetes como faltantes.

## Rutina de revisión

1. **Mensual:** revisar y mergear los pull requests agrupados de Dependabot
   cuando CI pasa. Confirmar en la página de Dependabot del repositorio que
   figure cada archivo compose con una imagen fijada, como `compose.postgres.yml`.
2. **Trimestral:** correr el reporte y abrir un work item por cada actualización
   de plataforma que rompa la regla de una major de atraso o llegue a `ends soon`.
3. **Actualizaciones del SDK de Expo:** seguir la guía de actualización de Expo,
   correr `npx expo install --fix` y planificar una build nativa, porque un SDK
   nuevo no se puede publicar por OTA.

## Tests

`node --test scripts/test/dependency-report.test.mjs scripts/test/dependabot-policy.test.mjs`
cubre la clasificación de saltos de versión, la lectura de cada herramienta, la
evaluación del fin de soporte, los errores por sección, la salida Markdown, la
línea de comandos y la política de Dependabot. `scripts/test/expo-doctor-check.test.mjs`
cubre la clasificación de expo-doctor con cobertura del 100%, y
`scripts/test/workflow-policy.test.mjs` cubre el error de revisión de Actions.
