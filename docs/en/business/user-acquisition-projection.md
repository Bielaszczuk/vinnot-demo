# 12-month user projection

How many people could have Vinnot a year from now, and through which channel they
arrive. The projection multiplies public behavior figures (how many people scan a QR
code, how many install an app, how many keep using it) by the efforts the business plans
to make: QR codes in wine shops, fairs and tastings, social media, ads and wineries.

**Status: estimate.** No channel is measured yet: the product does not record where each
user came from ([Key metrics](key-metrics.md#indicators-by-dimension)). Every input has
its source or is listed as an assumption. The presentation uses the same calculation, in
`docs-site/src/components/Presentation/growth.mjs`, and the site tests check that the
results on this page match it.

## Result

| Scenario | Cumulative installs, months 3 / 6 / 9 / 12 | Monthly active users, months 3 / 6 / 9 / 12 |
|---|---|---|
| Conservative | 473 / 1,047 / 1,719 / 2,490 | 179 / 228 / 280 / 335 |
| Base | 2,459 / 6,005 / 10,616 / 16,301 | 1,022 / 1,535 / 2,104 / 2,729 |
| Optimistic | 9,544 / 23,687 / 42,312 / 65,539 | 4,201 / 6,685 / 9,562 / 12,844 |

In the base scenario, Vinnot reaches month 12 with **16,301 installs** and **2,729 monthly
active users**. Active users stay near 15 to 20% of installs, because food and drink apps
keep between 3 and 7% of their users after the first month.

### Where the base scenario's installs come from

| Channel | Installs in 12 months | Share of the total |
|---|---:|---:|
| QR codes in wine shops | 7,371 | 45% |
| Fairs, tastings and tickets | 4,080 | 25% |
| Word of mouth and store search | 1,580 | 10% |
| Paid ads | 1,200 | 7% |
| QR codes in wineries | 1,170 | 7% |
| Social media | 900 | 6% |

Physical QR codes and fairs bring 7 out of every 10 installs. With the planned budgets,
social media and ads add little: the plan depends on being where people are already
choosing a wine.

## The wine-shop question

Out of 100 people who walk into a wine shop with a QR code on the counter, in the base
scenario **3 scan it and almost 1 installs the app** (3% scan rate times 30% install rate).
The intuitive figure of 10 installs per 100 visits is ten times higher than what public
data shows. To get closer, the QR code needs someone to mention it and a reason to scan
it, such as seeing the rating of the wine the person is holding.

## How each channel is calculated

The formulas are monthly; `m` is the month number. Values are listed as conservative /
base / optimistic.

| Channel | Formula | Inputs |
|---|---|---|
| QR codes in wine shops | shops added per month × m × people per day × scan rate × install rate × 30 days | 3 / 7 / 10 shops; 30 / 50 / 60 people; 1.5 / 3 / 5% scan; 20 / 30 / 35% install |
| Fairs and tastings | attendees reached per month × booth install rate + ticket buyers × 70% who use the app | 2,067 / 4,000 / 9,800 attendees; 2 / 5 / 8%; 60 / 200 / 600 buyers |
| Social media | posts × views × clicks × store conversion + collabs × followers × 20% reach × 1% swipe × 25% | 12 / 16 / 20 posts; 500 / 1,500 / 5,000 views; 0.5 / 1 / 1.5% clicks; 20 / 25 / 25%; 0 / 2 / 4 collabs of 15,000 / 15,000 / 30,000 followers |
| Paid ads | budget ÷ cost per install | USD 100 / 300 / 600 a month; USD 6.65 / 3 / 1.5 per install |
| QR codes in wineries | wineries added per month × m × visitors per month × scan rate × install rate | 1 / 2 / 4 wineries; 125 / 125 / 200 visitors; 10 / 20 / 30%; 20 / 30 / 40% |
| Word of mouth | search baseline + factor × active users of the previous month | 30 / 60 / 120 a month; 0.02 / 0.05 / 0.10 |
| Active users | installs of the month + retention × installs of earlier months | 3 / 5 / 8% retention |

The 70% of buyers who use the app comes from
[Capacity and cost projections](capacity-and-cost-projections.md), which assumes 30% web
use.

## Starting data

Public figures checked in November 2026.

| Data | Value | Scope | Source |
|---|---|---|---|
| Establishments that made wine | 875 | Argentina, 2024 harvest, INV | [Diario Uno](https://www.diariouno.com.ar/economia/con-la-cosecha-2024-crecio-la-cantidad-bodegas-que-elaboraron-vino-pero-el-consumo-interno-no-remonta-n1366046) |
| Wineries open to tourism | 486 in 17 provinces | Argentina, 2026, COVIAR | [Noticias NQN](https://www.noticiasnqn.com.ar/noticias/2026/03/14/329443-el-enoturismo-gana-protagonismo-como-estrategia-clave-para-las-bodegas) |
| Visitors per winery | median of 1,500 a year | Argentina, 2026 | Same source |
| Winery visits in Mendoza | 1,590,567 across 230 wineries | Mendoza, 2024, Emetur and COVIAR | [Sitio Andino](https://www.sitioandino.com.ar/economia/el-turismo-del-vino-se-afianza-como-otro-motor-economico-la-vitivinicultura-n5699930) |
| Households that buy wine | 72% | Argentina, 2025 | [Vinetur](https://www.vinetur.com/2025111193171/el-vino-esta-presente-en-el-72-de-los-hogares-argentinos-pero-cae-la-frecuencia-de-compra.html) |
| Wine consumption | 15.77 liters per person, the lowest on record | Argentina, 2025, INV | [Ámbito](https://www.ambito.com/negocios/los-argentinos-ya-no-toman-tanto-vino-2025-marco-el-record-menor-consumo-n6240002) |
| Internet users | 41.2 million, about 90% | Argentina, January 2025 | [DataReportal](https://datareportal.com/reports/digital-2025-argentina) |
| QR payments | 84% of people who pay by phone in a store use QR | Argentina, 2024 to 2026 | [iProUP](https://www.iproup.com/finanzas/67769-fin-del-efectivo-argentina-lidera-el-uso-de-billeteras-digitales-y-de-pagos-con-qr) |
| QR scan rate by placement | counter 6 to 14%; shelf 5 to 12%; poster 1 to 4% | Global, 2026, vendor data | [Linkbreakers](https://linkbreakers.com/help/article/qr-code-physical-placement-benchmarks) |
| Scan to install | 5 to 40% | Global, vendor data | [Linkbreakers](https://linkbreakers.com/help/article/qr-code-conversion-rate-benchmarks) |
| Store page to install | App Store 25%, Google Play 27.3%; food and drink 12.1 and 18.5% | United States, 2024 | [Adapty](https://adapty.io/blog/app-store-conversion-rate/) |
| Meta cost per thousand impressions | about USD 3.7, against USD 20.15 globally | Argentina, 2025 and 2026 | [Superads](https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/argentina) |
| Meta cost per install | USD 6.65 median | Argentina, November 2025 | [Superads](https://www.superads.ai/facebook-ads-costs/cost-per-app-install/argentina) |
| Organic engagement | TikTok 2.5%; Instagram 0.45% | Global, 2025 | [Socialinsider](https://www.socialinsider.io/data-geeks/benchmarks_2025.pdf) |
| Day-30 retention | 5 to 7% across apps; food and drink 3.6% on iOS and 2.9% on Android | Global, 2025 and 2026 | [Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/) and [Braze](https://www.braze.com/resources/articles/mobile-app-retention) |
| Fair attendance | Vinos y Bodegas, from 9,000 to more than 12,000; Wine Expo Mendoza, about 4,000; a Vendimia event, more than 8,000 | Argentina, 2015 to 2025 | [Mercado](https://mercado.com.ar/protagonistas/mas-de-12-000-personas-en-vinos-bodegas) and [Infobae](https://www.infobae.com/inhouse/2025/02/28/vinos-y-experiencias-asi-se-vivio-un-evento-de-la-vendimia-que-convoco-a-mas-de-8000-personas-en-mendoza/) |
| Vivino | more than 71 million registered users and 200,000 Premium subscribers | Global, 2025 | [Vivino](https://www.vivino.com/en/about) |

## Assumptions without a source

No public data was found for these inputs, so they are assumptions to validate with the
first measurements:

- The people who walk into a wine shop per day (30 / 50 / 60) and the number of wine
  shops in the country.
- How many wine shops and wineries join per month.
- The install rate at a fair booth with an incentive (2 / 5 / 8%).
- The views per post of a new account and its click rate.
- The word-of-mouth factor and the store-search baseline.
- Retention applied equally to every earlier month. If the drop continues after day 30,
  there will be fewer active users.
- The cost per install of the base and optimistic scenarios, calculated from the cost per
  thousand impressions and not measured.
- The QR scan rates, which come from vendors with no primary study behind them.

## What it means for the business

- **The base scenario passes the Expo free limit** (about 1,428 monthly active users)
  between months 5 and 6, so the cost plan must expect that step
  ([Capacity and cost projections](capacity-and-cost-projections.md)).
- **The 8% commission** starts with more than 5,000 active users for three months
  ([Monetization and plans](monetization.md#commission-roadmap)). Only the optimistic
  scenario gets there in the first year.
- **Pro wineries come from direct sales.** The base scenario adds about 24 wineries in the
  year; with the 3 to 8% free-to-paid conversion usual in software, that would be 1 or 2.
  That is why the [winery pricing roadmap](winery-pricing-roadmap.md) offers a founder
  price.
- **What to measure first:** each user's source channel, with a different QR code per
  wine shop, fair and winery, to replace these assumptions with Vinnot's own data.
