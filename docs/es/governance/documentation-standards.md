# Estándar de documentación técnica

## Principios

1. El código actual es la fuente de verdad.
2. Cada afirmación de comportamiento referencia una capa, contrato o archivo.
3. `docs/es` y `docs/en` conservan paths equivalentes.
4. La documentación canónica usa lenguaje técnico objetivo y orientado al sistema.
5. La evidencia de ejecución se conserva como artefactos reproducibles separados.
6. Incidencias, defectos, deuda técnica y planes de mejora se registran en el
   planning local ignorado por Git, no en documentación canónica.

## Profundidad esperada

Un documento de arquitectura debe cubrir propósito, límites, dependencias,
composición, decisiones, errores, seguridad, rendimiento, pruebas, evolución y
evidencia. Un caso de uso debe cubrir actores, precondiciones, flujo feliz,
alternativas, estados, invariantes, transacción, autorización, observabilidad y
tests. Un runbook incluye disparador, diagnóstico, mitigación, restore,
verificación y escalamiento.

## Diagramas

Se usa el diagrama mínimo que reduzca ambigüedad:

- flowchart para composición/decisión;
- sequence para interacción temporal;
- stateDiagram para lifecycle;
- ER para datos;
- deployment/context para infraestructura.

El texto explica invariantes que el gráfico no expresa. Un diagrama no debe
inventar componentes inexistentes ni contener resultados de una corrida puntual.
Cada bloque Mermaid lleva justo debajo el enlace a su imagen a tamaño completo;
ver [Sitio de documentación](documentation-site.md#diagramas-a-tamaño-completo).

## Ciclo de actualización

Cuando cambia código:

1. identificar contratos/rutas/estados afectados;
2. actualizar ES y EN en el mismo cambio;
3. enlazar cada página nueva desde el índice de su sección (cada sección se
   enlaza desde el índice raíz) y actualizar la trazabilidad si aparece un módulo;
4. ejecutar `python3 scripts/validate_documentation.py`;
5. revisar enlaces, Mermaid y referencias a paths, y compilar el
   [sitio de documentación](documentation-site.md) con
   `npm --prefix docs-site run build`;
6. si aparece un mismatch no resuelto, registrarlo en el planning local; la
   documentación versionada conserva exclusivamente el contrato soportado.

## Ubicación

El libro va de lo general a lo técnico. En la raíz: `README.md` presenta Vinnot;
`manuals` y `videos` muestran cómo se usa; `modules` documenta cada módulo del
producto (casos de uso, requisitos, arquitectura y pruebas); `architecture` da la
visión de sistema y el catálogo de `technologies`; `backend`, `frontend-web`,
`frontend-mobile`, `infra` y `shared` tienen el detalle técnico de cada
plataforma; `getting-started` el desarrollo local; `diagrams` es el catálogo de
diagramas (cada diagrama vive en la página que lo explica); `important-urls`,
`gantt` y `governance` cierran el libro.

Dentro de un área, `architecture` explica estructura y políticas; `use-cases`
comportamiento; `data` modelo/queries; `diagrams` vistas visuales; `testing`
estrategia; `guides` procedimientos de desarrollo/deploy; `operations` runbooks;
`design` sistema visual.

Los documentos canónicos se concentran en `docs/`, salvo los archivos que deben
permanecer en ubicaciones reconocidas por sus consumidores: `README.md` en la
raíz como entrada del repositorio, `AGENTS.md` en la raíz como instrucciones
descubiertas por los agentes y `.github/pull_request_template.md` como
plantilla descubierta automáticamente por GitHub. El validador de documentación
(`scripts/validate_documentation.py`) admite explícitamente estas excepciones.

## Evidencia y lenguaje

Evitar superlativos (“perfecto”, “100% seguro”) sin gate reproducible. Distinguir
implementado, verificado, aceptado, pendiente y fuera de alcance. Los ejemplos no
incluyen secretos ni PII. Inglés y español deben expresar la misma semántica,
aunque no requieran traducción literal línea por línea.

## Taxonomía y nivel de certeza

Cada afirmación normativa o descriptiva debe pertenecer a una categoría
verificable:

| Forma | Uso obligatorio |
|---|---|
| **implementa / ejecuta / devuelve** | comportamiento existente y comprobado en código |
| **debe** | invariante exigida por código, constraint, test o decisión arquitectónica vigente; se cita la evidencia |
| **puede** | rama soportada; la misma oración identifica la condición exacta que la habilita |
| **verificado** | existe un gate reproducible nombrado; no equivale automáticamente a listo para producción |

Una capacidad no implementada, una corrección pendiente o una propuesta de
evolución no pertenece a este corpus. Se registra en el planning local ignorado
por Git hasta que el código implementado permita incorporarla como contrato.

Excepción acotada: los capítulos de [modelo de negocio](../business/README.md),
[calidad](../quality/README.md) y [seguridad](../security/README.md) documentan
también decisiones de negocio, planes, objetivos propuestos, estimaciones y
limitaciones conocidas. Cada uno de esos enunciados lleva su estado explícito
(**implementado**, **planificado**, **objetivo propuesto**, **estimación** o
**pendiente**) y la fecha en que se relevó, y nunca se presenta como
comportamiento del código.

El capítulo de [cronograma](../gantt/README.md) aplica la misma excepción a la
hoja de ruta aprobada: diagramas de Gantt del trabajo planificado y su camino
crítico. Se rige por estas reglas:

- solo incorpora trabajo aprobado por el responsable del producto; las ideas,
  borradores y alternativas descartadas permanecen en el planning local;
- cada diagrama declara su horizonte y la fecha de aprobación del plan;
- una tarea terminada lleva la marca `done` y una evidencia verificable (pull
  request fusionado o release); una tarea sin esa marca es trabajo
  **planificado**;
- las tareas del camino crítico llevan la marca `crit`, y la página lista esa
  secuencia con sus dependencias y la holgura de cero días que la define;
- un cambio de alcance o de fechas actualiza el diagrama y su fecha de revisión
  en el mismo cambio, en español e inglés.

Están prohibidas expresiones como “según la política vigente”, “cuando
corresponde”, “se resuelve adecuadamente” o “respeta las relaciones” si la misma
frase no identifica la condición, el responsable y el mecanismo concreto. Para
autorización se documentan permiso, origen de identidad y chequeo de ownership.
Para persistencia se documentan handler, puerto, adapter, transacción y efecto de
foreign keys. Para fallos se documentan condición, código/status y responsable
de recuperación.

La clasificación arquitectónica canónica del backend es: **monolito modular**
como topología de despliegue, **arquitectura hexagonal** como dirección de
dependencias dentro de los módulos y **CQRS lógico** como separación de commands
y queries sobre una única PostgreSQL. Ninguno de esos términos sustituye a los
otros ni implica microservicios, event sourcing o dos bases.
