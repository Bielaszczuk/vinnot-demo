# Proyección de usuarios a 12 meses

Cuántas personas pueden tener Vinnot dentro de un año, y por qué canal llegan. La
proyección multiplica cifras públicas de comportamiento (cuánta gente escanea un QR,
cuántos instalan una app, cuántos siguen usándola) por los esfuerzos que el negocio
planea hacer: QR en vinotecas, ferias y catas, redes sociales, publicidad y bodegas.

**Estado: estimación.** Ningún canal está medido todavía: el producto no registra el
canal de origen de cada usuario ([Métricas clave](key-metrics.md#indicadores-por-dimensión)).
Cada entrada lleva su fuente o figura como supuesto. La presentación usa el mismo
cálculo, en `docs-site/src/components/Presentation/growth.mjs`, y los tests del sitio
verifican que los resultados de esta página coincidan con él.

## Resultado

| Escenario | Descargas acumuladas, meses 3 / 6 / 9 / 12 | Usuarios activos por mes, meses 3 / 6 / 9 / 12 |
|---|---|---|
| Conservador | 473 / 1.047 / 1.719 / 2.490 | 179 / 228 / 280 / 335 |
| Base | 2.459 / 6.005 / 10.616 / 16.301 | 1.022 / 1.535 / 2.104 / 2.729 |
| Optimista | 9.544 / 23.687 / 42.312 / 65.539 | 4.201 / 6.685 / 9.562 / 12.844 |

En el escenario base, Vinnot llega al mes 12 con **16.301 descargas** y **2.729 usuarios
activos por mes**. Los usuarios activos quedan cerca del 15 al 20 % de las descargas,
porque las apps de comida y bebida conservan entre el 3 y el 7 % de sus usuarios después
del primer mes.

### De dónde vienen las descargas del escenario base

| Canal | Descargas en 12 meses | Parte del total |
|---|---:|---:|
| QR en vinotecas | 7.371 | 45 % |
| Ferias, catas y entradas | 4.080 | 25 % |
| Boca a boca y búsqueda en tiendas | 1.580 | 10 % |
| Publicidad paga | 1.200 | 7 % |
| QR en bodegas | 1.170 | 7 % |
| Redes sociales | 900 | 6 % |

Los QR físicos y las ferias traen 7 de cada 10 descargas. Con los presupuestos previstos,
las redes y la publicidad suman poco: el plan depende de estar donde la gente ya está
eligiendo un vino.

## La pregunta de las vinotecas

De cada 100 personas que entran a una vinoteca con un QR en el mostrador, en el escenario
base **3 lo escanean y casi 1 instala la app** (3 % de escaneo por 30 % de instalación).
La cifra intuitiva de 10 instalaciones cada 100 visitas es diez veces más alta que lo que
muestran los datos públicos. Para acercarse, el QR necesita que alguien lo nombre y un
motivo para escanearlo, por ejemplo ver el puntaje del vino que la persona tiene en la
mano.

## Cómo se calcula cada canal

Las fórmulas son mensuales; `m` es el número de mes. Los valores van en el orden
conservador / base / optimista.

| Canal | Fórmula | Entradas |
|---|---|---|
| QR en vinotecas | vinotecas sumadas por mes × m × personas por día × escaneo × instalación × 30 días | 3 / 7 / 10 vinotecas; 30 / 50 / 60 personas; 1,5 / 3 / 5 % de escaneo; 20 / 30 / 35 % de instalación |
| Ferias y catas | asistentes alcanzados por mes × instalación en el stand + compradores de entradas × 70 % que usa la app | 2.067 / 4.000 / 9.800 asistentes; 2 / 5 / 8 %; 60 / 200 / 600 compradores |
| Redes sociales | publicaciones × vistas × clics × conversión de la tienda + colaboraciones × seguidores × 20 % de alcance × 1 % de deslizamiento × 25 % | 12 / 16 / 20 publicaciones; 500 / 1.500 / 5.000 vistas; 0,5 / 1 / 1,5 % de clics; 20 / 25 / 25 %; 0 / 2 / 4 colaboraciones de 15.000 / 15.000 / 30.000 seguidores |
| Publicidad paga | presupuesto ÷ costo por instalación | USD 100 / 300 / 600 por mes; USD 6,65 / 3 / 1,5 por instalación |
| QR en bodegas | bodegas sumadas por mes × m × visitantes por mes × escaneo × instalación | 1 / 2 / 4 bodegas; 125 / 125 / 200 visitantes; 10 / 20 / 30 %; 20 / 30 / 40 % |
| Boca a boca | base de búsqueda + factor × usuarios activos del mes anterior | 30 / 60 / 120 por mes; 0,02 / 0,05 / 0,10 |
| Usuarios activos | descargas del mes + retención × descargas de los meses anteriores | retención de 3 / 5 / 8 % |

El 70 % de compradores que usan la app sale de la
[Capacidad y proyección de costos](capacity-and-cost-projections.md), que supone un 30 %
de uso web.

## Datos de partida

Cifras públicas consultadas en noviembre de 2026.

| Dato | Valor | Alcance | Fuente |
|---|---|---|---|
| Establecimientos que elaboraron vino | 875 | Argentina, cosecha 2024, INV | [Diario Uno](https://www.diariouno.com.ar/economia/con-la-cosecha-2024-crecio-la-cantidad-bodegas-que-elaboraron-vino-pero-el-consumo-interno-no-remonta-n1366046) |
| Bodegas abiertas al turismo | 486 en 17 provincias | Argentina, 2026, COVIAR | [Noticias NQN](https://www.noticiasnqn.com.ar/noticias/2026/03/14/329443-el-enoturismo-gana-protagonismo-como-estrategia-clave-para-las-bodegas) |
| Visitantes por bodega | mediana de 1.500 por año | Argentina, 2026 | La misma fuente |
| Visitas a bodegas de Mendoza | 1.590.567 en 230 bodegas | Mendoza, 2024, Emetur y COVIAR | [Sitio Andino](https://www.sitioandino.com.ar/economia/el-turismo-del-vino-se-afianza-como-otro-motor-economico-la-vitivinicultura-n5699930) |
| Hogares que compran vino | 72 % | Argentina, 2025 | [Vinetur](https://www.vinetur.com/2025111193171/el-vino-esta-presente-en-el-72-de-los-hogares-argentinos-pero-cae-la-frecuencia-de-compra.html) |
| Consumo de vino | 15,77 litros por persona, el más bajo registrado | Argentina, 2025, INV | [Ámbito](https://www.ambito.com/negocios/los-argentinos-ya-no-toman-tanto-vino-2025-marco-el-record-menor-consumo-n6240002) |
| Usuarios de internet | 41,2 millones, cerca del 90 % | Argentina, enero de 2025 | [DataReportal](https://datareportal.com/reports/digital-2025-argentina) |
| Pago con QR | 84 % de quienes pagan con el celular en un comercio usan QR | Argentina, 2024 a 2026 | [iProUP](https://www.iproup.com/finanzas/67769-fin-del-efectivo-argentina-lidera-el-uso-de-billeteras-digitales-y-de-pagos-con-qr) |
| Escaneo de QR según ubicación | mostrador 6 a 14 %; estante 5 a 12 %; afiche 1 a 4 % | Global, 2026, datos de proveedor | [Linkbreakers](https://linkbreakers.com/help/article/qr-code-physical-placement-benchmarks) |
| Del escaneo a la instalación | 5 a 40 % | Global, datos de proveedor | [Linkbreakers](https://linkbreakers.com/help/article/qr-code-conversion-rate-benchmarks) |
| De la ficha de la tienda a la instalación | App Store 25 %, Google Play 27,3 %; comida y bebida 12,1 y 18,5 % | Estados Unidos, 2024 | [Adapty](https://adapty.io/blog/app-store-conversion-rate/) |
| Costo por mil impresiones en Meta | unos USD 3,7, frente a USD 20,15 global | Argentina, 2025 y 2026 | [Superads](https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/argentina) |
| Costo por instalación en Meta | USD 6,65 de mediana | Argentina, noviembre de 2025 | [Superads](https://www.superads.ai/facebook-ads-costs/cost-per-app-install/argentina) |
| Interacción orgánica | TikTok 2,5 %; Instagram 0,45 % | Global, 2025 | [Socialinsider](https://www.socialinsider.io/data-geeks/benchmarks_2025.pdf) |
| Retención al día 30 | 5 a 7 % en todas las apps; comida y bebida 3,6 % en iOS y 2,9 % en Android | Global, 2025 y 2026 | [Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/) y [Braze](https://www.braze.com/resources/articles/mobile-app-retention) |
| Asistencia a ferias | Vinos y Bodegas, entre 9.000 y más de 12.000; Wine Expo Mendoza, unas 4.000; un evento de Vendimia, más de 8.000 | Argentina, 2015 a 2025 | [Mercado](https://mercado.com.ar/protagonistas/mas-de-12-000-personas-en-vinos-bodegas) e [Infobae](https://www.infobae.com/inhouse/2025/02/28/vinos-y-experiencias-asi-se-vivio-un-evento-de-la-vendimia-que-convoco-a-mas-de-8000-personas-en-mendoza/) |
| Vivino | más de 71 millones de usuarios registrados y 200.000 suscriptores Premium | Global, 2025 | [Vivino](https://www.vivino.com/en/about) |

## Supuestos sin fuente

No se encontraron datos públicos para estas entradas, así que son supuestos para
validar con las primeras mediciones:

- Las personas que entran por día a una vinoteca (30 / 50 / 60) y la cantidad de
  vinotecas del país.
- Cuántas vinotecas y bodegas se suman por mes.
- La instalación en un stand de feria con un incentivo (2 / 5 / 8 %).
- Las vistas por publicación de una cuenta nueva y su tasa de clics.
- El factor de boca a boca y la base de búsqueda en las tiendas.
- La retención aplicada por igual a todos los meses anteriores. Si la caída sigue
  después del día 30, los usuarios activos serán menos.
- El costo por instalación de los escenarios base y optimista, calculado con el costo
  por mil impresiones y no medido.
- Las tasas de escaneo de QR, que vienen de proveedores sin un estudio primario detrás.

## Qué implica para el negocio

- **El escenario base pasa el límite gratuito de Expo** (unos 1.428 usuarios activos
  por mes) entre el mes 5 y el 6, así que el plan de costos debe prever ese salto
  ([Capacidad y proyección de costos](capacity-and-cost-projections.md)).
- **La comisión del 8 %** se activa con más de 5.000 usuarios activos durante tres
  meses ([Monetización y planes](monetization.md#hoja-de-ruta-de-la-comisión)). Solo
  el escenario optimista llega en el primer año.
- **Las bodegas Pro llegan por venta directa.** El escenario base suma unas 24 bodegas en
  el año; con una conversión gratuita a paga del 3 al 8 % habitual en software, serían
  1 o 2. Por eso la [hoja de ruta de precios para bodegas](winery-pricing-roadmap.md)
  ofrece un precio de fundadora.
- **Qué medir primero:** el canal de origen de cada usuario, con un QR distinto por
  vinoteca, feria y bodega, para reemplazar estos supuestos por datos propios.
