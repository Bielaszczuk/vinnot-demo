# Pruebas

Casos de prueba del módulo: uno por el flujo principal de cada caso de uso y uno por cada flujo alternativo. Se pueden ejecutar a mano en la web y en la app; la columna de tests automáticos indica qué tests ejercen el caso de uso.

## Casos de prueba

| ID | Caso de uso | Pasos | Resultado esperado |
|---|---|---|---|
| `CP-AI-01` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | 1) La persona abre el perfil IA: en la web, desde la tarjeta del sommelier; en la app, desde la tarjeta «Sommelier exclusivo» del vino con «Ver perfil» o «Generar perfil», o desde la pestaña «Perfil», que muestra el perfil guardado. 2) El cliente pide `GET /wines/{wineId}/ai-profile` en el idioma de la interfaz. 3) La API devuelve el perfil guardado sin generar nada. 4) El cliente muestra resumen, análisis visual, aromas, boca, sabores, maridajes, servicio, ocasiones y vinos similares, solo las secciones que existen. | La persona ve el perfil de sommelier del vino en su idioma. |
| `CP-AI-20` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Flujo principal → 2a. El vino no existe, o está inactivo y la persona no lo creó ni modera el catálogo | La API responde 404 `NOT_FOUND` sin leer ni generar ningún perfil. |
| `CP-AI-02` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Flujo principal → 3a. No hay perfil | La API responde 404 y el cliente lo trata como un perfil por generar. La web muestra «Este vino todavía no tiene perfil de IA» y la app «Perfil no disponible», las dos con «Generar perfil»; también lo pide solo al llegar con «generar». El cliente envía `POST /wines/{wineId}/ai-profile`. |
| `CP-AI-03` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Flujo principal → 3b. La API reutiliza el perfil si existe en los dos idiomas y el vino y el modelo no cambiaron; si no, lo genera en español e inglés y guarda ambos juntos. | La API reutiliza el perfil si existe en los dos idiomas y el vino y el modelo no cambiaron; si no, lo genera en español e inglés y guarda ambos juntos. |
| `CP-AI-04` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Flujo principal → 3c. Otra persona ya está generando el mismo perfil | La API espera ese resultado en lugar de llamar de nuevo a la IA. |
| `CP-AI-05` | [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | Flujo principal → 3d. La IA no está disponible o se agotó el presupuesto | La API responde 503 y el cliente permite reintentar. |
| `CP-AI-06` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | 1) La persona abre Comparar, desde un vino o desde el catálogo. 2) Elige el vino A y el vino B con el buscador. 3) El cliente envía `POST /wines/compare`: en la web en cuanto hay dos vinos; en la app, al tocar «Comparar». 4) La API comprueba que la persona puede ver los dos vinos y reutiliza la comparación guardada para ese par e idioma, o la genera en español e inglés. 5) El cliente muestra resumen, diferencias, similitudes, tabla de atributos, para qué conviene cada uno y la recomendación. | La persona ve la comparación de los dos vinos con atributos y una recomendación. |
| `CP-AI-07` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | Flujo principal → 3a. A y B son el mismo vino | La web no ofrece en el buscador el vino que ya ocupa la otra posición y la app no permite comparar; la API responde 422. |
| `CP-AI-08` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | Flujo principal → 4a. La IA no está disponible o se agotó el presupuesto | La API responde 503 y el cliente conserva la selección y permite reintentar. |
| `CP-AI-09` | [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | Flujo principal → 4b. Falla la red o vence el tiempo | El cliente lo distingue del error del servidor y no muestra ninguna recomendación. |
| `CP-AI-10` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | 1) El editor muestra las secciones del perfil del idioma activo como textos, listas y puntajes. 2) La persona edita y guarda. 3) El cliente envía `PATCH /wines/{wineId}/ai-profile` sin llamar a la IA. 4) La API valida el contenido y lo guarda. | El perfil del idioma activo quedó editado o regenerado. |
| `CP-AI-11` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Flujo principal → 2a. La persona elige «Regenerar» y confirma | El cliente envía `POST /wines/{wineId}/ai-profile/generate` y la API genera de nuevo los dos idiomas, reemplazando las ediciones manuales. |
| `CP-AI-12` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Flujo principal → 4a. Falta el resumen, una sección no tiene la forma esperada o un puntaje está fuera de 0 a 100 | La API responde 400. |
| `CP-AI-13` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Flujo principal → 4b. El perfil cambió mientras se generaba | La API responde 409. |
| `CP-AI-14` | [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | Flujo principal → 2b. En la app la persona sale con cambios sin guardar | Se pide confirmación; «Restaurar» vuelve al contenido guardado. |
| `CP-AI-15` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | 1) El sistema verifica que las llamadas pagas estén habilitadas. 2) Reserva un lugar entre las llamadas simultáneas permitidas. 3) Reserva el costo máximo de la llamada contra el presupuesto mensual y, si existe, el diario. 4) Hace la llamada al proveedor. 5) Registra el costo real y libera el lugar. | La llamada se hizo dentro del presupuesto o se rechazó sin costo. |
| `CP-AI-16` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Flujo principal → 1a. Las llamadas pagas están pausadas | Se rechaza con 503. |
| `CP-AI-17` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Flujo principal → 2a. No hay lugar libre | Se rechaza con 503. |
| `CP-AI-18` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Flujo principal → 3a. El presupuesto no alcanza | Se rechaza con 503. |
| `CP-AI-19` | [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | Flujo principal → 4a. No se sabe si la llamada se cobró | El costo queda reservado como desconocido. |

## Matriz de trazabilidad

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-AI-01`](use-cases/uc-ai-01-view-ai-profile.md) | RF-WEB-AI-01, RF-WEB-AI-02, RF-WEB-AI-03, RF-WEB-AI-04, RF-APK-AI-01, RF-APK-AI-02, RF-APK-AI-03, RF-APK-AI-04 | CP-AI-01, CP-AI-20, CP-AI-02, CP-AI-03, CP-AI-04, CP-AI-05 | 8 | 3 | 2 |
| [`UC-AI-02`](use-cases/uc-ai-02-compare-wines.md) | RF-WEB-AI-05, RF-WEB-AI-06, RF-APK-AI-05, RF-APK-AI-06 | CP-AI-06, CP-AI-07, CP-AI-08, CP-AI-09 | 5 | 2 | 4 |
| [`UC-AI-03`](use-cases/uc-ai-03-edit-ai-profile.md) | RF-WEB-AI-07, RF-WEB-AI-08, RF-APK-AI-07, RF-APK-AI-08, RF-APK-AI-09, RF-APK-AI-10 | CP-AI-10, CP-AI-11, CP-AI-12, CP-AI-13, CP-AI-14 | 3 | 0 | 2 |
| [`UC-AI-04`](use-cases/uc-ai-04-control-ai-cost.md) | — | CP-AI-15, CP-AI-16, CP-AI-17, CP-AI-18, CP-AI-19 | 4 | n/a | n/a |

Las columnas Backend, Web y App cuentan los archivos de test que ejercen el caso; el detalle está en cada caso de uso. «n/a» indica que el caso no aplica a esa plataforma.
