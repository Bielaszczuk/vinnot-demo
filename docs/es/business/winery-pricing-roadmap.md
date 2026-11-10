# Hoja de ruta de precios para bodegas

La propuesta comercial para ofrecer el plan Pro a una bodega: cuánto cuesta hoy, cómo
sube a medida que crece la audiencia y por qué conviene entrar ahora. Completa la
[suscripción para bodegas](monetization.md#suscripción-para-bodegas), que define los
planes Free y Pro.

**Estado: planificado.** El plan Pro todavía no existe en el producto. La idea del
negocio, en palabras del dueño: «hoy como estamos con poca cartera de usuarios el valor
de la suscripción son 20 usd [...] de acá a un año la suscripción va a valer 50 usd, por
eso te conviene congelar el precio ahora, y no se te va a aumentar por 2 años». Las
fases, los umbrales y los beneficios de esta página ordenan esa idea en una propuesta y
pueden ajustarse. Las audiencias son las del escenario base de la
[proyección de usuarios a 12 meses](user-acquisition-projection.md).

El mes 1 es el mes de lanzamiento del plan Pro para las bodegas fundadoras, con fecha
objetivo el 01-03-2027 (estado: **planificado**, acordado el 06-11-2026); el calendario
está en el [cronograma](../gantt/README.md).

## Fases del precio

| Fase | Desde | Precio de lista | Condición para empezar | Audiencia proyectada al final de la fase |
|---|---|---|---|---|
| 1. Bodegas fundadoras | Mes 1 | USD 20 por mes | Cupo de 50 bodegas | 6.005 descargas y 1.535 usuarios activos al mes 6 |
| 2. Crecimiento | Mes 7 | USD 35 por mes | 1.500 usuarios activos por mes | 16.301 descargas y 2.729 usuarios activos al mes 12 |
| 3. Escala | Mes 13 | USD 50 por mes | 2.500 usuarios activos por mes | Sin proyección todavía: se recalcula con los datos del primer año |

El precio sube solo si se cumplen las dos cosas: llegó el mes y la audiencia alcanzó el
umbral. Si Vinnot crece más lento, el precio espera. En el escenario base, la fase 2
encuentra 1.535 usuarios activos al mes 6 y la fase 3 encuentra 2.729 al mes 12, así
que las dos empiezan a tiempo. El primer umbral coincide con el momento en que el
costo de operación da un salto, al pasar del plan gratuito de Expo
([Capacidad y proyección de costos](capacity-and-cost-projections.md)).

## La oferta de bodega fundadora

| Regla | Detalle |
|---|---|
| Cupo | Las primeras 50 bodegas que contraten el plan Pro |
| Precio | USD 20 por mes, congelado durante 24 meses desde la contratación |
| Después de los 24 meses | Pasa al precio de lista vigente, con 60 días de aviso |
| Comisión sobre entradas | No forma parte del acuerdo: sigue la [hoja de ruta de la comisión](monetization.md#hoja-de-ruta-de-la-comisión) como para cualquier organizador |
| Si la bodega cancela | Pierde el precio de fundadora; al volver paga el precio de lista |
| Cobro | Suscripción de App Store o Google Play, como el resto del plan Pro ([Monetización y planes](monetization.md#economía-de-las-tiendas)) |

El cupo cerrado y el plazo de 24 meses limitan el riesgo: el descuento habitual para los
primeros clientes de un software es del 25 al 50 % durante 6 a 12 meses, y los precios
congelados de por vida se desaconsejan si el grupo no tiene un límite
([Monetizely](https://www.getmonetizely.com/articles/how-to-choose-the-perfect-pricing-model-for-early-stage-saas-without-scaring-users-away)).
La oferta de Vinnot es más generosa a propósito, porque necesita a las primeras bodegas
para que haya informes que mostrar.

### Cuánto ahorra una bodega fundadora

| Meses | Precio de lista | Paga la fundadora | Ahorro |
|---|---|---|---|
| 1 a 6 | USD 20 | USD 20 | USD 0 |
| 7 a 12 | USD 35 | USD 20 | USD 90 |
| 13 a 24 | USD 50 | USD 20 | USD 360 |
| **Total en 24 meses** | | | **USD 450** |

## Recorrido de una bodega fundadora

| Momento | Precio de lista | Paga la fundadora | Audiencia proyectada | Qué suma la bodega |
|---|---|---|---|---|
| Mes 1 | USD 20 | USD 20 | Lanzamiento con QR en vinotecas y ferias | Ficha, catálogo cargado con ayuda, eventos con entradas e informe semanal y mensual |
| Mes 7 | USD 35 | USD 20 | 6.005 descargas y 1.535 activos al mes 6 | Más vinos superan el mínimo de 10 personas; tendencia semanal de puntaje y opiniones |
| Mes 13 | USD 50 | USD 20 | 16.301 descargas y 2.729 activos al mes 12 | Perfil de gusto de su audiencia y posición frente a vinos de su tipo, cepa y región |
| Mes 24 | USD 50 | USD 20 | Se recalcula con los datos del primer año | Termina el precio congelado: ahorró USD 450 y pasa al precio de lista con 60 días de aviso |

## Qué gana la bodega

### Desde el lanzamiento, como fundadora

- Todo el [plan Free](monetization.md#plan-free-y-plan-pro): perfil de la bodega, sus
  propios vinos, eventos con venta de entradas y cobro dividido por Mercado Pago
  ([Pagos](../modules/payments/README.md)), distintivo de bodega verificada, respuesta
  oficial a reseñas y métricas básicas.
- Ayuda del equipo para cargar el catálogo de sus vinos.
- Pulso semanal e informe mensual con el interés, las opiniones y la audiencia de sus
  vinos, frente a vinos pares ([Informes para bodegas](winery-reports.md)).
- Distintivo de bodega fundadora y presencia en los QR de vinotecas y ferias con los que
  Vinnot suma usuarios.
- Precio congelado durante 24 meses.

### Cuando haya muchos usuarios

- Más vinos con datos: un informe muestra una cifra solo cuando hay al menos 10 personas
  detrás, para cuidar la privacidad. Con pocos usuarios, muchos vinos no llegan a ese
  mínimo; con más usuarios, sí.
- El perfil de gusto de quienes eligen sus vinos: cepas y tipos preferidos.
- La posición de cada vino frente a otros del mismo tipo, cepa o región.
- La zona de su audiencia y cuántas personas llegan a sus eventos desde Vinnot.

## Cómo se compara el precio

Ninguna alternativa es idéntica al plan Pro, y varias cifras vienen de fuentes
secundarias, indicadas en cada caso. Untappd, Wine Market Council y Wine Intelligence se
relevaron el 06-11-2026.

- **Publicidad:** con un costo de unos USD 3,7 cada mil impresiones en Meta, USD 20 por
  mes compran unas 5.400 impresiones en Argentina
  ([Superads](https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/argentina)).
  El plan Pro, en cambio, da datos sobre quienes ya prueban los vinos de la bodega.
- **Herramientas para bodegas:** una plataforma de reservas como CellarPass empieza en
  USD 199 por mes, según un sitio de reseñas
  ([Krowdbase](https://www.krowdbase.com/software/cellarpass-guest-management-platform)).
- **Untappd for Business**, el análogo mejor documentado (cerveza): informes sueltos de
  USD 79 a 99 y suscripciones de USD 899 a 1.199 por año y local, según fuentes de
  competidores, no precios oficiales
  ([Next Glass](https://nextglass.substack.com/p/introducing-the-untappd-insights);
  [Brewlytics](https://brewlytics.ai/blog/untappd-for-business-pricing)).
- **Wine Market Council:** membresía de unos USD 400 a 1.000 por año
  ([Wine Industry Advisor](https://wineindustryadvisor.com/2024/02/28/registration-open-wine-market-council-research-conference-2024/)).
- **Wine Intelligence:** informes de mercado de 1.500 a 2.500 libras cada uno, precios
  de 2021 ([Wine Intelligence](https://wineintelligence.com/?p=53616)).

USD 20 por mes (USD 240 por año) queda por debajo de todas. A ese precio el plan Pro
compite con un informe automático e interpretado, no con un servicio de analistas.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| La audiencia crece más lento que el escenario base | El precio de lista no sube hasta que se cumple el umbral de usuarios activos |
| Pocas bodegas convierten solas del plan Free al Pro | Las métricas básicas del plan Free muestran lo que agrega el Pro; la venta es directa: visitas a bodegas y ferias con esta propuesta |
| Los informes muestran pocos datos al principio | La regla de 10 personas se explica desde el primer día; el informe muestra qué vinos todavía no llegan |
| 50 bodegas con USD 20 congelados limitan el ingreso | Aun con el cupo completo, el plan Pro neto de la tienda (USD 17 por bodega) suma USD 850 por mes, diez veces el costo de operación actual ([Costos actuales](costs.md)) |
