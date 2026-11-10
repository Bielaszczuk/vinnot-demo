# Flujo de issues, ramas y pull requests

## Objetivo

El repositorio usa un issue como identidad estable de cada unidad de trabajo. La
rama se crea después del issue y queda vinculada en la sección **Development**
de GitHub. Esto evita ramas sin trazabilidad y nombres que aparentan referenciar
un issue inexistente.

## Tipos de trabajo

| Tipo | Uso | Rama base | Ejemplo |
|---|---|---|---|
| `feature` | capacidad nueva de producto o negocio | `development` | `feature/101-business-payment-logic` |
| `bugfix` | defecto reproducible sin emergencia productiva | `development` | `bugfix/102-fix-wine-search` |
| `hotfix` | incidente urgente presente en producción | `main` | `hotfix/103-restore-authentication` |
| `task` | infraestructura, documentación, refactor o mantenimiento | `development` | `task/104-update-ci-policy` |

`#` se usa al mencionar el issue (`#101`), pero no dentro de la rama. El número
no lleva ceros a la izquierda porque debe coincidir literalmente con el número
asignado por GitHub.

Issues y ramas se crean con el workflow **Create Work Branch**
(`.github/workflows/create-work-branch.yml`), no a mano; ver la sección siguiente.

### Retorno de un hotfix a `development`

Ningún workflow ni script lleva un hotfix de `main` a `development`. Después de
integrar el PR del hotfix en `main`, se abre un PR de `main` hacia `development`
(o se aplica el commit del hotfix con `git cherry-pick` en una rama que apunte a
`development`). Así el próximo release desde `development` no revierte la
corrección.

## Crear issue y rama desde GitHub

El workflow `.github/workflows/create-work-branch.yml` ofrece un formulario
manual:

1. abrir **Actions → Create Work Branch → Run workflow**;
2. elegir el tipo;
3. para un issue existente, completar `issue_number`;
4. para un trabajo nuevo, dejar ese campo vacío y completar `title` y
   `description`;
5. opcionalmente, completar `start_date` y `end_date` con fechas `YYYY-MM-DD`;
6. ejecutar el workflow desde `main`.

El workflow valida el tipo y el issue, crea la etiqueta `type:*` si todavía no
existe, conserva las etiquetas previas, obtiene el commit de la rama base y usa
la mutación oficial `createLinkedBranch`. El resultado informa issue, rama,
base y enlaces en el summary de la ejecución.

Los workflows manuales sólo aparecen cuando su archivo existe en la rama por
defecto del repositorio. Por eso este workflow debe llegar a `main` antes de
poder ejecutarse desde la interfaz de Actions.

## Fechas y roadmap de GitHub Projects

Las fechas pertenecen al **item del issue en el Project**, no a la rama. El
formulario recibe texto ISO (por ejemplo, `2026-09-16`), no un calendario: Actions
no ofrece un tipo de input fecha. `end_date` representa el fin planificado, no
la fecha real de cierre. Ambas fechas son opcionales como conjunto; si se ingresa
una, se exige la otra. Deben ser fechas reales y el fin no puede preceder al inicio.
Si ambas quedan vacías, se conserva el flujo de rama sin consultar Projects ni
modificar fechas existentes.

### Configuración del repositorio y del Project

En **Settings → Secrets and variables → Actions**, configurar:

| Configuración | Tipo | Valor predeterminado / propósito |
|---|---|---|
| `PROJECT_TOKEN` | Secret | Token personal con acceso de escritura al Project del usuario; un PAT clásico requiere scope `project` y, para issues privados, acceso al repositorio mediante `repo`. |
| `WORK_PROJECT_OWNER` | Variable | `Bielaszczuk`; actualizar si cambia el propietario o su login. |
| `WORK_PROJECT_NUMBER` | Variable | `3`; número del Project, no de su vista. |
| `WORK_PROJECT_START_FIELD` | Variable | `Start date`; nombre exacto del campo de inicio. |
| `WORK_PROJECT_END_FIELD` | Variable | `Target date`; nombre exacto del campo de fin. |

El Project personal debe tener ambos campos de tipo **Date**. Se reutilizan los
campos existentes; no se crean campos ni se modifica la vista automáticamente.
En la vista **Roadmap → Date fields**, seleccionar esos mismos campos como inicio
y fin. La visibilidad de cada item también depende de los filtros de la vista.
Si se renombraron campos, configurar las variables correspondientes respetando
mayúsculas y espacios. No guardar el token en archivos ni en inputs del workflow.
El `GITHUB_TOKEN` habitual sigue creando issues, etiquetas y ramas; el secret
adicional se utiliza exclusivamente para Projects, que requiere permisos distintos.

### Secuencia y recuperación

1. Validar fechas y configuración; consultar acceso de escritura al Project y
   resolver sus campos de fecha, incluyendo paginación, antes de crear el issue.
2. Crear el issue o reutilizar el número recibido y conservar sus etiquetas.
3. Agregar el issue al Project, o reutilizar su item si ya estaba agregado, y
   guardar las dos fechas. Las fechas proporcionadas reemplazan las anteriores.
4. Crear la rama vinculada y publicar los enlaces y fechas en el resumen de Actions.

Una configuración inválida detectada en la comprobación previa no crea issues
ni ramas. Las mutaciones remotas no constituyen una transacción: un fallo posterior
puede dejar un issue creado, un item agregado o una fecha guardada. El workflow
informa el número del issue para reintentar con `issue_number` y evitar duplicarlo.
Si falla la escritura de fechas, no se intenta crear la rama. Si el fallo ocurre
durante la creación de la rama, verificar primero si GitHub llegó a crearla antes
de reintentar: la creación de ramas no es una operación de actualización.

Referencias: [automatización de Projects con Actions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)
y [configuración del roadmap](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout).

## Formularios de issues

`.github/ISSUE_TEMPLATE` contiene formularios separados:

- feature: necesidad, resultado y criterios de aceptación;
- bugfix: comportamiento observado/esperado, reproducción y regresión;
- hotfix: impacto productivo, evidencia, mitigación y rollback;
- task: objetivo, alcance, terminado y dependencias.

Los formularios aseguran información mínima cuando el issue se crea primero de
forma manual. Después se ejecuta **Create Work Branch** con su número.

## Pull requests

La plantilla requiere resumen, issue relacionado, validación y evidencia. Una
rama creada mediante `createLinkedBranch` aparece vinculada al issue y su pull
request hereda esa relación.

GitHub sólo interpreta `Closes #123` como cierre automático cuando el pull
request apunta a la rama por defecto. Para un PR hacia `development` se utiliza
`Refs #123`; el cierre se realiza en el PR de release hacia `main` o de forma
explícita cuando corresponda al flujo de integración.

El job `Repository checks` de `ci.yml` valida el nombre de rama de los pull
requests internos al abrirlos, reabrirlos o actualizar su rama. La política sólo
se exige cuando el script de la política ya existe en el commit base del pull request;
de este modo, el PR que introduce la convención puede integrarse aunque provenga
de una rama creada con el formato anterior. Una vez incorporado a la rama base,
todos los PR posteriores quedan sujetos a la regla. El chequeo ejecuta los scripts
de la política desde el commit base, nunca desde la cabeza del pull request, para
que un PR no pueda cambiar la regla con la que se lo valida; un cambio de política
sólo rige una vez incorporado a la rama base.

Se permiten la convención canónica, `main`, `development` y ramas de Dependabot
o Renovate. Forks externos no ejecutan esta validación para evitar evaluar código
de automatización no confiable con supuestos del repositorio.

## Checklist previo al merge

La plantilla de pull request enumera los chequeos a recorrer antes de hacer push
y antes de mergear. Cada ítem previene una clase de falla observada en las 72
ejecuciones fallidas de GitHub Actions entre el 2026-06-20 y el 2026-10-21:
nombres de rama inválidos, pushes sin el preflight completo, tests de timers
inestables, pins de Actions sin revisar, pull requests en rojo mergeados igual,
advisories de seguridad salteadas, cortes por presupuesto de Actions, cambios de
workflows de deploy sin probar y releases de producción armados desde un commit
equivocado. El repositorio no tiene protección de ramas, así que el checklist es
el control.

## Implementación verificable

- `.github/workflows/create-work-branch.yml`;
- `.github/workflows/ci.yml` (job `Repository checks`);
- `.github/ISSUE_TEMPLATE/*.yml`;
- `.github/pull_request_template.md`;
- `scripts/github-work-item-policy.mjs`;
- `scripts/create-github-work-item.mjs`;
- `scripts/github-project-schedule.mjs`;
- `scripts/validate-github-branch.mjs`;
- `scripts/test/github-work-item-policy.test.mjs`;
- `scripts/test/create-github-work-item.test.mjs`;
- `scripts/test/github-project-schedule.test.mjs`;
- `scripts/test/create-github-work-item-project.test.mjs`.
