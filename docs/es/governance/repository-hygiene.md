# Contenido versionado y archivos privados

## Criterio

Git conserva código, configuración sin secretos, lockfiles, assets del producto,
pruebas y procedimientos reproducibles. Un script reutilizable y documentado
pertenece al sistema aunque se ejecute sólo en local. Un generador personal que
depende de rutas de usuario o un runtime ajeno al repositorio queda en local.

| Contenido | Ubicación | Git |
|---|---|---|
| Backend, web, mobile y assets fuente | sus proyectos | sí |
| Arquitectura, contratos, guías y runbooks ES/EN | `docs/` | sí |
| Configuración pública, IAM, Compose y Worker | `infra/`, `.github/` | sí, sin credenciales |
| Importadores, migraciones, seguridad, release y desarrollo | scripts de raíz/proyecto/infra | sí, con configuración externa |
| Fixtures sintéticos y manifiestos de pruebas | junto a sus suites | sí; sin cuentas reales ni tokens utilizables |
| Entornos, tokens R2, claves Apple/firma y credenciales DB | secret manager o archivo privado | no |
| Dumps, backups, originales, estados/manifiestos de corridas | archivo operativo privado | no |
| Planning personal, capturas, reportes y planillas generadas | planning/artefactos locales y `outputs/` | no |
| Dependencias, caches y proyectos nativos generados | `node_modules/`, `.venv/`, `.expo/`, mobile `android/` y `ios/` | no |
| Instrucciones de agentes y proyecto de memoria compartida | `AGENTS.md` en la raíz, `.engram/config.json` | sí |
| Estado local de herramientas de agentes | `.atl/`, `odd/`, `.claude/settings.local.json` | no |

Los IDs AWS/Cloudflare, nombres de buckets, OAuth client IDs y certificados
públicos de firma son identificadores, no secretos. Claves privadas, client
secrets y tokens sí lo son. `VITE_*` y `EXPO_PUBLIC_*` se publican en el cliente.

## Herramientas que se conservan

| Familia | Consumidor o procedimiento |
|---|---|
| Impacto, gates y verificadores de revisión | [CI/CD](../infra/guides/ci-cd.md) |
| Publicadores y contratos de release | [Despliegue](../infra/guides/deployment.md) |
| Scanners, audits y backports mobile | [Seguridad de dependencias](../infra/guides/dependency-security.md) |
| Reporte de actualización de dependencias | [Actualización de dependencias](../infra/guides/dependency-updates.md) |
| Issues/ramas y agenda del proyecto | [Work items GitHub](github-work-items.md) |
| Importadores y backup/restore | [Datos](../backend/data/database-model.md), [backup/restore](../infra/operations/backup-and-disaster-recovery.md) |
| `scripts/wine-images` | [Catálogo R2](../infra/operations/catalog-images-r2.md), [uploads R2](../infra/operations/user-images-r2.md) |
| Benchmark de escaneo y fixtures | [Calidad del escáner](../frontend-mobile/testing/strategy.md) |
| Contenido público y preview de emails | [Contenido público](../modules/support/architecture.md), [emails](../modules/users/architecture.md) |
| Metro, teléfono, simulador y preview OTA | [Desarrollo mobile](../frontend-mobile/guides/development.md) |

Estos scripts reciben credenciales y datos reales desde fuera del repositorio.
Se versionan procedimientos y esquemas de manifiesto, no estados, usuarios ni
resultados de una ejecución concreta.

## Comprobación antes de integrar

Desde la raíz:

```bash
git status --short
git diff --cached --stat
git ls-files outputs
git ls-files '*/node_modules' '*/node_modules/*' 'node_modules' 'node_modules/*'
python3 scripts/validate_documentation.py
gitleaks git --redact --no-banner --log-opts="--all" .
```

Las dos consultas de archivos locales no deben devolver contenido. `.gitignore`
no elimina archivos ya versionados. `git rm --cached -- <archivo>` retira un
artefacto del índice conservando su copia local; agregar también su ignore.

Gitleaks revisa credenciales reconocidas en el historial disponible; no prueba
ausencia de toda PII ni derechos de uso. CI obtiene el historial remoto completo
y conserva el reporte redactado como artefacto de retención limitada.
`.gitleaksignore` sólo acepta fingerprints históricos concretos y explicados,
sin excepciones por carpeta/regla. Una clave efímera generada en memoria por un
test se distingue de una clave real copiada a Git.

Retirar un archivo en un commit no lo quita del historial. Ante un secreto real,
revocar/rotar primero y evaluar una limpieza histórica coordinada. Reescribir
historia cambia hashes y clones y no forma parte de una corrección documental.

## Evidencia y publicación

Las guías describen contratos y comandos de verificación. SHA activo, builds,
grupos OTA, resultados de corridas, backups y cuentas de prueba pertenecen al
registro privado y artefactos CI. No deducir que `main` ya esté desplegado ni que
una OTA equivalga a aprobación de tienda. Revisión API/web, manifiesto Expo y
estado de App Store/Google Play se verifican como superficies independientes.
