# Backlog de mejoras de calidad

Brechas detectadas al medir la calidad de Vinnot contra su [modelo](quality-model.md) y sus
[métricas](metrics.md), con la acción propuesta, la prioridad y el estado. Cuando una
mejora se aborde, se crea su issue con el workflow **Create Work Branch**
([flujo de trabajo](../governance/github-work-items.md)) y se enlaza en esta tabla.

Al 29-10-2026 ninguna de estas mejoras tiene un issue abierto. Los issues cerrados que se
citan son antecedentes que resolvieron una parte del problema.

## Prioridades

- **Alta:** afecta dinero, datos o disponibilidad, o deja sin medir un riesgo crítico.
- **Media:** deja sin medir una característica priorizada o sin automatizar un control
  manual.
- **Baja:** mejora la calidad de las propias pruebas o de datos no críticos.

## Mejoras

| ID | Hallazgo | Característica | Acción propuesta | Prioridad | Estado | Issue |
|---|---|---|---|---|---|---|
| MB-01 | El p95 medido en desarrollo (2,9 s) supera el objetivo propuesto de 500 ms ([M-05](metrics.md#m-05-tiempo-de-respuesta-p95-de-lecturas)) | Eficiencia de desempeño | Script de carga con k6 ([CP-NF-04](non-functional-test-cases.md#cp-nf-04-medir-el-tiempo-de-respuesta-bajo-carga)) en producción fuera del pico, objetivo formal de latencia y optimización de las consultas más lentas ([Rendimiento de consultas](../backend/data/query-performance.md)) | Alta | Pendiente | — |
| MB-02 | Un único servidor por entorno, sin alta disponibilidad ni simulacro integral registrado ([M-17](metrics.md#m-17-rto-y-rpo)) | Fiabilidad | Simulacro de restauración trimestral ([CP-NF-05](non-functional-test-cases.md#cp-nf-05-restaurar-una-copia-de-seguridad)) y evaluación de una segunda instancia para producción | Alta | Parcial: restauración aislada de la base automatizada | Antecedente: #149 (cerrado) |
| MB-03 | No hay reporte de fallos de la app en dispositivos (crash reporting) | Fiabilidad, analizabilidad | Incorporar una herramienta de reporte de fallos para la app y la web | Alta | Pendiente | — |
| MB-04 | El CI ejecuta una sola especificación E2E (`release-retention.spec.ts`); las otras 11 y la matriz de navegadores corren a pedido ([M-24](metrics.md#m-24-plataformas-con-e2e-aprobados)) | Fiabilidad, portabilidad | Ejecutar las especificaciones críticas (autenticación, sesión, catálogo) en CI y la matriz completa antes de cada release | Media | Pendiente | — |
| MB-05 | No hay pruebas extremo a extremo automáticas en la app móvil | Fiabilidad, portabilidad | Evaluar Maestro o Detox para inicio de sesión, inscripción y pago | Media | Pendiente | — |
| MB-06 | El escaneo no alcanza el 90 % de precisión ni el p95 de 10 s ([M-06](metrics.md#m-06-tiempo-de-escaneo-p95), [M-07](metrics.md#m-07-precisión-del-escaneo)) | Adecuación funcional, eficiencia | Ampliar el conjunto de etiquetas del benchmark y medir cada versión del modelo antes de cambiarlo | Media | Parcial: benchmark con conjuntos versionados en [`scripts/data`](../../../scripts/data) | Antecedente: #127 (cerrado) |
| MB-07 | No hay pruebas automáticas de accesibilidad ni pruebas con usuarios ([M-11](metrics.md#m-11-tasa-de-finalización-de-tareas), [M-12](metrics.md#m-12-puntaje-sus), [M-14](metrics.md#m-14-criterios-wcag-cumplidos)) | Usabilidad | Agregar axe a las pruebas extremo a extremo y hacer una prueba de usabilidad con cuestionario SUS | Media | Pendiente | — |
| MB-08 | Solo el 16,5 % de las bodegas argentinas tiene ubicación exacta verificada ([M-25](metrics.md#m-25-bodegas-con-ubicación-exacta)) | Calidad de datos | Completar la geolocalización en ciclos mensuales y medir M-25 en cada ciclo | Media | En curso por ciclos | — |
| MB-09 | Pagos, webhooks y disponibilidad no tienen medición periódica ([M-03](metrics.md#m-03-exactitud-de-pagos-acreditados), [M-10](metrics.md#m-10-webhooks-de-pago-procesados), [M-15](metrics.md#m-15-disponibilidad-mensual)) | Adecuación funcional, fiabilidad | Conciliación mensual contra Mercado Pago y reporte mensual de disponibilidad desde la sonda | Media | Pendiente | — |
| MB-10 | La alarma de errores 5xx se dispara al 5 %, por encima del objetivo propuesto del 1 % ([M-16](metrics.md#m-16-tasa-de-errores-5xx)) | Fiabilidad | Medir la tasa real durante un mes y decidir si baja el umbral sin generar falsas alarmas | Baja | Pendiente | — |
| MB-11 | No hay pruebas de mutación que midan la calidad de las propias pruebas | Mantenibilidad | Evaluar PIT en el backend y Stryker en la web y la app sobre las reglas de pago e inscripción | Baja | Pendiente | — |

## Cómo se usa este backlog

- Cada mejora tiene una métrica que la mide. La mejora se cierra cuando la métrica cumple su
  umbral o cuando el responsable de producto documenta el desvío aceptado.
- Los riesgos aceptados quedan explícitos y revisables, como el tiempo de escaneo para el
  lanzamiento.
- Las métricas se vuelven a medir en cada release mayor y el
  [resumen de métricas](metrics.md#resumen) se actualiza con la fecha de la medición.
