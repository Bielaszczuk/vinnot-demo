# Informes para bodegas

Esta página define qué contienen los informes del
[plan Pro para bodegas](monetization.md#suscripción-para-bodegas), de qué datos de
Vinnot salen, qué reglas de privacidad cumplen y cómo se van a validar.

**Estado: planificado.** El catálogo se definió el 06-11-2026 a partir de un estudio de
fuentes públicas internacionales: plataformas de venta directa para bodegas,
plataformas de consumidores, organismos de inteligencia de mercado, literatura
académica y normativa de privacidad. Ningún informe está construido. El catálogo se
ajusta con las [entrevistas piloto](#validación) de diciembre de 2026, y el lanzamiento
objetivo del plan Pro está en el [cronograma](../gantt/README.md).

## Vinnot vende demanda, no ventas

Las bodegas valoran por encima de todo los datos de venta: conversión de visitantes
en compradores y en socios del club, ticket promedio, retención y abandono del club.
Esos datos ya los pagan dentro de sus plataformas de venta directa. Commerce7 ofrece
más de 70 informes, 14 tableros y un modelo de predicción de abandono del club
([Commerce7](https://documentation.commerce7.com/8-wp-definitions-of-dtc-terms);
[Wine Industry Advisor](https://wineindustryadvisor.com/2025/09/16/from-churn-prediction-to-chatdtc-commerce7-debuts-ai-features-built-for-dtc-growth/)),
y WineDirect y OrderPort miden ticket promedio, abandono del club, tráfico web y ritmo
de reservas
([WineDirect y Enolytics](https://info.winedirect.com/hubfs/WineDirectxEnolytics_DTC_ImpactReport_2022.pdf?hsLang=en);
[OrderPort](https://orderport.net/decanted-industry-insights-by-orderport/measuring-digital-engagement-in-dtc-wine-sales-a-practical-guide-for-wineries)).
Vinnot no puede producirlos: no vende vino ni registra el precio pagado.

Lo que sí tiene Vinnot son señales previas a la compra, el espacio que ni esas
plataformas ni las fuentes oficiales argentinas cubren:

| Fuente que hoy usa una bodega argentina | Qué cubre | Qué no cubre |
|---|---|---|
| Plataforma de venta directa (Commerce7, WineDirect, OrderPort) | Ventas, socios del club, ticket promedio | Qué les gusta, guardan o califican las personas antes de comprar |
| Instituto Nacional de Vitivinicultura (INV) | Despachos mensuales por tipo, color, envase y provincia, con 3 a 4 semanas de demora ([INV](https://www.argentina.gob.ar/sites/default/files/2018/10/mensual_merc._interno_-_sep_2025_0.pdf)) | Marca y opinión del consumidor |
| Panel minorista de Scentia | Cerca del 40 % de la comercialización, con costo alto ([Los Andes](https://www.losandes.com.ar/opinion/hasta-500-por-botella-un-techo-para-los-vinos-argentinos)) | Opinión y gusto del consumidor |
| **Informes de Vinnot** | Interés, opinión y audiencia de sus vinos, cada semana y frente a vinos pares | Ventas |

Las mismas seis familias de datos de consumidor aparecen en Vivino, Wine-Searcher,
Untappd y CellarTracker: cuántas personas interactúan con los vinos, cómo los califican
y con qué tendencia, cómo se comparan con vinos pares, qué dicen las reseñas, dónde está
la audiencia y qué otros gustos tiene
([Google Cloud, caso Vivino](https://cloud.google.com/customers/vivino);
[Wine-Searcher](https://www.wine-searcher.com/technology);
[Untappd](https://help.untappd.com/hc/en-us/articles/360045444011-Brewery-Insights-Breakdown);
[CellarTracker](https://support.cellartracker.com/article/23-getting-started-for-wineries)).

La comparación con pares es el centro del informe. Mostrar puntajes aumentó las ventas
de los vinos con calificación promedio o superior y las redujo en los de calificación
baja ([Hilger, Rafert y Villas-Boas, 2011](https://econpapers.repec.org/RePEc:tpr:restat:v:93:y:2011:i:4:p:1289-1296)),
y las calificaciones de Vivino se inflan con el tiempo
([Journal of Wine Economics](https://www.cambridge.org/core/journals/journal-of-wine-economics/article/expertise-accuracy-and-reputation-inflation-in-the-wine-market-evidence-from-vivino-ratings/F45F4FE22D64B6E41B1A616C0892FBD5)),
así que una tendencia solo se interpreta frente a vinos de la misma uva, región y tipo.

## Etiquetas y base de cada cifra

Cada métrica lleva una etiqueta visible. Ninguna se presenta como venta.

| Etiqueta | Qué agrupa |
|---|---|
| Interés | Vistas, escaneos de etiqueta, altas en cava e inscripciones a eventos |
| Opinión | Calificaciones y reseñas |
| Audiencia | Región y gustos de las personas que interactúan con los vinos |
| Contexto | Datos públicos de la categoría, como los del INV |

Cada informe aclara al pie que la base son **usuarios de Vinnot**, no un panel
representativo, y muestra la base de cada cifra, como hacen IWSR y el Wine Market
Council.

## Pulso semanal

La cadencia tiene antecedentes: Vivino ofrecía estadísticas semanales a las bodegas con
suscripción ([Vivino](https://www.slideshare.net/slideshow/vivino-by-impero/42790190)) y
Wine Australia combina un boletín semanal con informes más profundos
([Wine Australia](https://www.wineaustralia.com/Market-insights)). El pulso es corto, a
nivel de bodega, con ventanas móviles de 28 días y la diferencia contra los 28 días
previos. Si una cifra no alcanza la regla de publicación, el informe dice «datos
insuficientes esta semana» en lugar de mostrar un corte frágil. Los cortes por vino,
región o gusto pasan al informe mensual.

| Contenido | Etiqueta | Fuente en Vinnot | Regla de publicación |
|---|---|---|---|
| Personas que vieron, escanearon o guardaron en cava algún vino de la bodega, y variación contra la ventana previa | Interés | `content_views` con tipo `WINE` ([V66](../../../backend/src/main/resources/db/migration/V66__engagement_signals.sql)), `wine_label_scans` ([V70](../../../backend/src/main/resources/db/migration/V70__points_and_wax_seal_emblems.sql)), `cellar_wines` | Solo el total de la bodega, con n ≥ 10 y redondeado |
| Calificaciones nuevas: cantidad y promedio, frente al promedio de vinos pares | Opinión | `reviews.rating` ([V1](../../../backend/src/main/resources/db/migration/V1__baseline_schema.sql)) y uva, región y tipo de `wines` | Promedio solo con n ≥ 10, redondeado a medio punto |
| Vino de la bodega con más interés en la ventana | Interés | Las mismas tablas que la primera fila | Solo si ese vino tiene n ≥ 10 |
| Inscripciones y confirmaciones a próximos eventos de la bodega | Interés | `event_registrations` | Conteos, sin región ni gustos |
| Una alerta, si cae el interés o se repite un tema negativo en las reseñas | Interés u Opinión | Las cifras publicables de esta tabla | Se calcula solo con cifras que cumplen su propia regla |

## Informe mensual

El análisis con cortes por vino, región y perfil de gusto, y tres lecturas sugeridas en
lenguaje simple. Las bodegas chicas identifican costo y falta de capacidades como las
barreras para usar datos ([Agriculture, 2026](https://doi.org/10.3390/agriculture16101085);
[OIV, 2023](https://www.bio-conferences.org/articles/bioconf/full_html/2023/13/bioconf_oiv2023_01034/bioconf_oiv2023_01034.html)),
por eso el informe trae pocas métricas interpretadas y no un tablero para explorar.

| Contenido | Etiqueta | Fuente en Vinnot | Regla de publicación |
|---|---|---|---|
| Calificaciones por vino: volumen, promedio y tendencia de 3 meses, frente a vinos de la misma uva, región y tipo | Opinión | `reviews`, `wines` | Celdas con n ≥ 10; tendencia relativa a los pares |
| Temas frecuentes en las reseñas, positivos y negativos | Opinión | Título y comentario de `reviews` | Temas presentes en 10 o más reseñas, sin datos del autor |
| Embudo de interés por vino: vistas, escaneos, altas en cava y calificaciones | Interés | `content_views`, `wine_label_scans`, `cellar_wines`, `reviews` | Cada etapa con n ≥ 10 |
| Posición de cada vino en un ranking de interés dentro de su uva y región | Interés | Las mismas tablas que el embudo | Posición o cuartil, sin conteos de otros vinos |
| Distribución de la audiencia por provincia o país | Audiencia | `user_event_areas` ([V50](../../../backend/src/main/resources/db/migration/V50__user_event_areas.sql)); solo personas que eligieron una zona para eventos | Provincias con n ≥ 10; el resto agrupado como «otras» |
| Perfil de gusto de la audiencia por uva y tipo, y «a quienes les gusta tu vino también les gusta» | Audiencia | `user_taste_affinities` ([V52](../../../backend/src/main/resources/db/migration/V52__user_taste_affinities.sql)) | Distribuciones de la cohorte, nunca perfiles individuales; control de homogeneidad |
| Segmentos de interacción: muy comprometidos, nuevos y que dejaron de interactuar | Audiencia | `content_views`, `cellar_wines`, `reviews` | Solo conteos de segmento con n ≥ 10 |
| Interés por banda de precio de referencia | Interés | `wines.price_min` y `wines.price_max` | Solo vinos con rango cargado; se aclara que es precio de lista, no precio pagado |
| Eventos del mes: inscripciones, confirmaciones, cancelaciones y actividad sobre los vinos de la bodega 30 días después | Interés | `event_registrations` y las tablas de interés | El seguimiento posterior solo con n ≥ 10 |
| Contexto de la categoría, por ejemplo la participación del Malbec en las ventas de varietales | Contexto | Datos públicos del INV ([La Capital](https://www.lacapitalmdp.com/malbec-argentina-informe-inv-2026-superficie-produccion-exportaciones/)) | Datos públicos |
| Tres lecturas sugeridas | — | Las cifras publicadas del mes | Derivadas solo de cifras publicadas |

Las vistas de `content_views` se registran solo en la app, solo con sesión iniciada, y
se borran a los 180 días ([Actividad](../modules/activity/README.md)): los informes se
generan antes de ese borrado. El precio de compra y las notas privadas de la cava nunca
entran en un informe.

Con la regla de 10 personas, una bodega con poca audiencia recibe informes con pocas
cifras. Una ventana trimestral para esas bodegas está **pendiente** de decisión; bajar el
umbral no es una opción.

## Qué no puede medir Vinnot

| Métrica | Por qué Vinnot no la produce | Dónde la obtiene la bodega |
|---|---|---|
| Ventas, conversión, ticket promedio, retención y abandono del club | Vinnot no vende vino ni registra el precio pagado. Su único dato de venta son las entradas de eventos cobradas con Mercado Pago, y es venta de entradas, no de vino | Su plataforma de venta directa |
| Conocimiento de la marca entre quienes no usan Vinnot | Vinnot solo observa a sus propios usuarios | Estudios de salud de marca como los de IWSR ([Rural News Group](https://ruralnewsgroup.co.nz/wine-grower/wg-general-news/intel-and-insights-brand-health-tracking)) |
| Predicción de abandono, alta al club o valor de vida del cliente | Requiere los datos de los clientes de la bodega | Modelos de su plataforma de venta directa |

El posicionamiento de precio y la edad de la audiencia tampoco se pueden producir hoy;
dependen de los [datos nuevos planificados](#datos-nuevos-planificados).

## Privacidad y políticas de las tiendas

### La regla de 10 personas

Cada cifra publicada, sea un conteo o un promedio, debe reunir al menos 10 personas
**en cada celda, después de aplicar todos los filtros**. El mínimo es necesario pero no
alcanza: en cohortes chicas (una bodega pequeña, una provincia, un evento) los totales,
los promedios y la diferencia entre dos informes consecutivos permiten reidentificar
personas. El umbral también es bajo frente a los mínimos comerciales: LinkedIn exige
audiencias de 300 miembros ([LinkedIn](https://www.linkedin.com/help/lms/answer/106247)).
Por eso la regla se completa con estas salvaguardas, derivadas de la Opinión
05/2014 del Grupo del Artículo 29 ([WP216](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2014/wp216_en.pdf))
y de la práctica de Google Analytics 4 ([Google](https://support.google.com/analytics/answer/9383630?hl=en)).

| Salvaguarda | Qué evita |
|---|---|
| Suprimir o fusionar celdas complementarias | Que el total menos las celdas visibles revele una celda con menos de 10 personas |
| Agrupar la región en provincia y el tiempo en mes cuando la base es chica | Singularizar a una persona por lugar o fecha |
| Redondear conteos (por ejemplo, a múltiplos de 5) y promedios (a medio punto), o agregar ruido leve, y controlar las diferencias entre informes consecutivos | Deducir la calificación de una persona comparando dos informes |
| Ocultar un atributo si todos los miembros de una celda lo comparten | Inferir un atributo de todas las personas de la celda |
| No entregar texto de reseñas con datos del autor (región, gustos, fecha exacta); entregar temas resumidos | Reidentificar al autor por el texto, el dato de mayor riesgo |
| No entregar vectores de gusto individuales, listas de personas ni exportaciones por fila | Reconstruir perfiles individuales |
| Excluir del cálculo las cuentas del equipo de la propia bodega | Que las calificaciones del personal inflen o identifiquen una cohorte |
| Prohibir por contrato que la bodega intente reidentificar personas o cruzar los informes con su CRM | La responsabilidad solidaria de Vinnot si la disociación falla |

### Marco legal relevado

Resumen de las normas relevadas el 06-11-2026. No es una opinión legal: la revisión
legal está **planificada** del 01-12-2026 al 19-12-2026.

| Norma | Qué establece | Efecto sobre los informes |
|---|---|---|
| Ley 25.326, art. 2 ([InfoLEG](https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm)) | Define la disociación: el tratamiento que impide asociar el dato a una persona determinada o determinable | Los informes deben ser disociados en la práctica, no solo agregados |
| Ley 25.326, art. 11, inc. 3, e) | La cesión no requiere consentimiento si se aplicó un procedimiento de disociación que vuelve inidentificables a los titulares | Si la disociación se cumple, entregar el informe no requiere consentimiento de cada persona |
| Ley 25.326, art. 11, inc. 4 | Quien cede y quien recibe responden en forma solidaria | Si la disociación falla, Vinnot responde junto con la bodega |
| Ley 25.326, art. 28 | Excluye de la ley las estadísticas que no pueden atribuirse a una persona | Refuerza el criterio de no identificabilidad |
| LGPD, art. 12 (Brasil) ([UFRGS](https://www.ufrgs.br/proprivacidade/anonimizacao)) | Excluye los datos anonimizados salvo que la anonimización se pueda revertir con esfuerzo razonable; trata como personales los datos usados para el perfil de comportamiento de una persona identificada | Nunca entregar perfiles individuales |
| WP216 (usuarios europeos) | Evalúa la anonimización por singularización, vinculación e inferencia; agregar sobre grupos chicos facilita la inferencia | Fundamenta las salvaguardas de la tabla anterior |

La Ley 25.326 sigue vigente: el proyecto de reemplazo perdió estado parlamentario
([BDO Argentina](https://www.bdoargentina.com/es-ar/publicaciones/categoria-de-publicaciones/grupo-de-publicaciones/ley-de-proteccion-de-datos-personales-en-argentina-sus-principales-desafios-frente-al-avance-de-la)).
Ninguna resolución de la AAIP fija un tamaño mínimo de grupo; la prueba es que nadie
pueda ser identificado en la práctica.

### Riesgos abiertos con las tiendas

| Política | Estado | Detalle |
|---|---|---|
| Apple, guía 5.1.2 ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)) | Riesgo abierto | La 5.1.2(i) limita compartir con terceros los datos que recolecta la app a «mejorar la app o servir publicidad»; la 5.1.2(iii) prohíbe facilitar la reidentificación a partir de datos declarados como agregados. Vender informes a bodegas no es ninguna de las dos cosas, y el texto no aclara si los agregados no personales cuentan como datos recolectados por la app |
| Google Play, política de datos de usuario | Pendiente | No se verificó todavía su texto sobre compartir datos agregados o anonimizados |

Mientras la revisión legal no concluya, la lectura conservadora es tratar los informes
como alcanzados por la guía 5.1.2. Medidas propuestas, sujetas a esa revisión (estado:
**objetivo propuesto**): compartir solo agregados que cumplan la 5.1.2(iii), declararlo
en la [política de privacidad](../modules/legal/README.md) y en las etiquetas de
privacidad de las tiendas, avisar a los usuarios existentes antes del lanzamiento y
ofrecer una opción para excluirse de los informes agregados.

## Datos nuevos planificados

Cuatro datos nuevos cierran las brechas más valiosas del catálogo. **Estado:
planificado**; las fechas están en el [cronograma](../gantt/README.md). Cada uno se
recolecta recién después de actualizar la política de privacidad y las etiquetas de
privacidad de App Store y Google Play.

| Dato | Cómo se recolecta | Qué informe habilita |
|---|---|---|
| Rango de edad | Opcional y en rangos amplios, en el perfil | Edad de la audiencia, como la que reporta Untappd ([Untappd](https://help.untappd.com/hc/en-us/articles/11365624716692-Beer-Report)); los millennials ya son la mayor cohorte de consumidores en Estados Unidos ([Wine Intelligence](https://wine-intelligence.com/blogs/wine-analytics-pricing-report-data/millennials-take-the-lead-as-the-largest-wine-consumer-group-in-the-u-s)) |
| Precio pagado y lugar de compra | Opcionales, al calificar un vino | Posicionamiento de precio frente al mercado, como el de Vivino y Wine-Searcher ([Wine-Searcher](https://www.wine-searcher.com/trade/data-reports)) |
| Búsquedas internas | Registro agregado de las búsquedas dentro de Vinnot | Ranking de demanda por búsquedas, como el Wine Rank ([Wine-Searcher](https://www.wine-searcher.com/wine-rank)) |
| Ingreso al evento | Cada entrada muestra un código QR vinculado a su número de referencia; en la puerta, el organizador lo escanea desde su celular y marca la asistencia | Tasa de asistencia, que OrderPort trata como indicador adelantado |

Hoy la confirmación de un evento la hace la propia persona sobre su lugar reservado
([`ConfirmEventAttendanceCommandHandler`](../../../backend/src/main/java/com/vinnot/event/application/command/handler/ConfirmEventAttendanceCommandHandler.java));
no existe un registro de ingreso el día del evento.

La edad no es el mejor segmentador: la literatura indica que el nivel de involucramiento
con el vino segmenta mejor
([Marketing Management Journal](https://marketingmanagementjournal.scholasticahq.com/article/157560-a-latent-class-segmentation-of-wine-drinkers-consumption)),
y ese nivel ya se deriva del comportamiento en Vinnot.

## Validación

| Paso | Estado | Qué valida |
|---|---|---|
| Entrevistas piloto con tres bodegas, del 01-12-2026 al 12-12-2026 | Planificado | Qué informes del catálogo les resultan útiles; el catálogo se ajusta con el resultado |
| Pilotos posteriores al lanzamiento que comparan las señales de interés de Vinnot con las ventas propias de cada bodega | Planificado, sin fecha | Si las señales de interés anticipan ventas |

No existe evidencia publicada de que las altas en cava, los escaneos de etiqueta o los
perfiles de gusto se conviertan en ventas. Las cifras de precisión disponibles, como el
93 % que declara Tastry para predecir perfiles de gusto, son afirmaciones de la propia
empresa ([Retail IT Insights](https://www.retailitinsights.com/doc/tastry-launches-tastry-uncorked-a-personalized-ai-recommender-for-e-commerce-0001)).
Hasta que los pilotos lo validen, ningún informe afirma que una señal predice una venta.

Dos límites más quedan explícitos en el producto:

- Los usuarios de Vinnot son entusiastas que eligieron usar la app, no una muestra
  representativa de consumidores.
- Las calificaciones de la comunidad coinciden con los críticos en torno al 40 % en
  tintos de Burdeos, frente al 63 % entre críticos
  ([The Drinks Business](https://www.thedrinksbusiness.com/2025/01/vivinos-crowd-reviews-gain-credibility-in-cambridge-study/)):
  sirven más para vinos jóvenes de consumo cotidiano que para vinos de guarda.

Ninguna encuesta ordena cuantitativamente qué métrica valoran más las bodegas; el orden
del catálogo es una inferencia a partir de lo que ofrecen las plataformas y de lo que
las bodegas le pidieron a Vivino.

## Fuentes

Fuentes consultadas el 06-11-2026; cada una está enlazada en la sección donde se usa.
