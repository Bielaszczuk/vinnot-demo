# Winery reports

This page defines what the reports of the
[winery Pro plan](monetization.md#winery-subscription) contain, which Vinnot data they
come from, which privacy rules they follow and how they will be validated.

**Status: planned.** The catalogue was defined on 2026-11-06 from a study of
international public sources: direct-to-consumer (DTC) platforms for wineries,
consumer platforms, market intelligence bodies, academic literature and privacy rules.
No report is built yet. The catalogue is adjusted with the
[pilot interviews](#validation) of December 2026, and the Pro plan's target launch is
in the [timeline](../gantt/README.md).

## Vinnot sells demand, not sales

Wineries value sales data above everything else: visitor-to-buyer and
visitor-to-club-member conversion, average order value, club retention and churn. They
already pay for that data inside their DTC platforms. Commerce7 offers more than 70
reports, 14 dashboards and a club churn prediction model
([Commerce7](https://documentation.commerce7.com/8-wp-definitions-of-dtc-terms);
[Wine Industry Advisor](https://wineindustryadvisor.com/2025/09/16/from-churn-prediction-to-chatdtc-commerce7-debuts-ai-features-built-for-dtc-growth/)),
and WineDirect and OrderPort measure average order value, club attrition, web traffic
and booking pace
([WineDirect and Enolytics](https://info.winedirect.com/hubfs/WineDirectxEnolytics_DTC_ImpactReport_2022.pdf?hsLang=en);
[OrderPort](https://orderport.net/decanted-industry-insights-by-orderport/measuring-digital-engagement-in-dtc-wine-sales-a-practical-guide-for-wineries)).
Vinnot cannot produce them: it does not sell wine or record the price paid.

What Vinnot does have are pre-purchase signals, the space that neither those platforms
nor the official Argentine sources cover:

| Source an Argentine winery uses today | What it covers | What it does not cover |
|---|---|---|
| DTC platform (Commerce7, WineDirect, OrderPort) | Sales, club members, average order value | What people like, save or rate before they buy |
| National Viticulture Institute (INV) | Monthly shipments by type, colour, packaging and province, 3 to 4 weeks late ([INV](https://www.argentina.gob.ar/sites/default/files/2018/10/mensual_merc._interno_-_sep_2025_0.pdf)) | Brand and consumer opinion |
| Scentia retail panel | About 40% of trade, at a high cost ([Los Andes](https://www.losandes.com.ar/opinion/hasta-500-por-botella-un-techo-para-los-vinos-argentinos)) | Consumer opinion and taste |
| **Vinnot reports** | Interest, opinion and audience of its wines, every week and against peer wines | Sales |

The same six families of consumer data appear in Vivino, Wine-Searcher, Untappd and
CellarTracker: how many people interact with the wines, how they rate them and with
what trend, how they compare with peer wines, what reviews say, where the audience is
and what else it likes
([Google Cloud, Vivino case](https://cloud.google.com/customers/vivino);
[Wine-Searcher](https://www.wine-searcher.com/technology);
[Untappd](https://help.untappd.com/hc/en-us/articles/360045444011-Brewery-Insights-Breakdown);
[CellarTracker](https://support.cellartracker.com/article/23-getting-started-for-wineries)).

Peer comparison is the core of the report. Showing scores raised sales of wines rated
average or above and lowered them for low-rated wines
([Hilger, Rafert and Villas-Boas, 2011](https://econpapers.repec.org/RePEc:tpr:restat:v:93:y:2011:i:4:p:1289-1296)),
and Vivino ratings inflate over time
([Journal of Wine Economics](https://www.cambridge.org/core/journals/journal-of-wine-economics/article/expertise-accuracy-and-reputation-inflation-in-the-wine-market-evidence-from-vivino-ratings/F45F4FE22D64B6E41B1A616C0892FBD5)),
so a trend is only read against wines of the same grape, region and type.

## Labels and the base of each figure

Each metric carries a visible label. None is presented as a sale.

| Label | What it groups |
|---|---|
| Interest | Views, label scans, cellar additions and event registrations |
| Opinion | Ratings and reviews |
| Audience | Region and tastes of the people who interact with the wines |
| Context | Public category data, such as INV's |

Each report states in its footer that the base is **Vinnot users**, not a
representative panel, and shows the base of each figure, as IWSR and the Wine Market
Council do.

## Weekly pulse

The cadence has precedents: Vivino offered weekly statistics to subscribing wineries
([Vivino](https://www.slideshare.net/slideshow/vivino-by-impero/42790190)) and Wine
Australia combines a weekly bulletin with deeper reports
([Wine Australia](https://www.wineaustralia.com/Market-insights)). The pulse is short,
at winery level, with 28-day rolling windows and the change against the previous 28
days. When a figure does not meet its publication rule, the report says "not enough
data this week" instead of showing a fragile cut. Cuts by wine, region or taste move to
the monthly report.

| Content | Label | Source in Vinnot | Publication rule |
|---|---|---|---|
| People who viewed, scanned or added to a cellar any of the winery's wines, and change against the previous window | Interest | `content_views` with kind `WINE` ([V66](../../../backend/src/main/resources/db/migration/V66__engagement_signals.sql)), `wine_label_scans` ([V70](../../../backend/src/main/resources/db/migration/V70__points_and_wax_seal_emblems.sql)), `cellar_wines` | Winery total only, with n ≥ 10 and rounded |
| New ratings: count and average, against the average of peer wines | Opinion | `reviews.rating` ([V1](../../../backend/src/main/resources/db/migration/V1__baseline_schema.sql)) and the grape, region and type in `wines` | Average only with n ≥ 10, rounded to half a point |
| The winery's wine with the most interest in the window | Interest | The same tables as the first row | Only if that wine has n ≥ 10 |
| Registrations and confirmations for the winery's upcoming events | Interest | `event_registrations` | Counts, with no region or tastes |
| An alert, if interest drops or a negative theme repeats in reviews | Interest or Opinion | The publishable figures of this table | Computed only from figures that meet their own rule |

## Monthly report

The analysis with cuts by wine, region and taste profile, and three suggested readings
in plain language. Small wineries name cost and lack of skills as their barriers to
using data ([Agriculture, 2026](https://doi.org/10.3390/agriculture16101085);
[OIV, 2023](https://www.bio-conferences.org/articles/bioconf/full_html/2023/13/bioconf_oiv2023_01034/bioconf_oiv2023_01034.html)),
so the report brings a few interpreted metrics, not a dashboard to explore.

| Content | Label | Source in Vinnot | Publication rule |
|---|---|---|---|
| Ratings per wine: volume, average and 3-month trend, against wines of the same grape, region and type | Opinion | `reviews`, `wines` | Cells with n ≥ 10; trend relative to peers |
| Frequent themes in reviews, positive and negative | Opinion | Title and comment in `reviews` | Themes present in 10 or more reviews, with no author data |
| Interest funnel per wine: views, scans, cellar additions and ratings | Interest | `content_views`, `wine_label_scans`, `cellar_wines`, `reviews` | Each stage with n ≥ 10 |
| Each wine's position in an interest ranking within its grape and region | Interest | The same tables as the funnel | Position or quartile, with no counts of other wines |
| Audience distribution by province or country | Audience | `user_event_areas` ([V50](../../../backend/src/main/resources/db/migration/V50__user_event_areas.sql)); only people who chose an area for events | Provinces with n ≥ 10; the rest grouped as "other" |
| Audience taste profile by grape and type, and "people who like your wine also like" | Audience | `user_taste_affinities` ([V52](../../../backend/src/main/resources/db/migration/V52__user_taste_affinities.sql)) | Cohort distributions, never individual profiles; homogeneity check |
| Engagement segments: highly engaged, new and lapsed | Audience | `content_views`, `cellar_wines`, `reviews` | Segment counts only, with n ≥ 10 |
| Interest by reference price band | Interest | `wines.price_min` and `wines.price_max` | Only wines with a range loaded; it states that this is list price, not price paid |
| Events of the month: registrations, confirmations, cancellations and activity on the winery's wines 30 days later | Interest | `event_registrations` and the interest tables | The follow-up only with n ≥ 10 |
| Category context, for example Malbec's share of varietal sales | Context | Public INV data ([La Capital](https://www.lacapitalmdp.com/malbec-argentina-informe-inv-2026-superficie-produccion-exportaciones/)) | Public data |
| Three suggested readings | — | The month's published figures | Derived only from published figures |

Views in `content_views` are recorded only in the app, only when signed in, and are
deleted after 180 days ([Activity](../modules/activity/README.md)): reports are built
before that deletion. Purchase prices and private cellar notes never enter a report.

With the 10-person rule, a winery with a small audience gets reports with few figures.
A quarterly window for those wineries is **pending** a decision; lowering the threshold
is not an option.

## What Vinnot cannot measure

| Metric | Why Vinnot does not produce it | Where the winery gets it |
|---|---|---|
| Sales, conversion, average order value, club retention and churn | Vinnot does not sell wine or record the price paid. Its only sales data are event tickets charged through Mercado Pago, and those are ticket sales, not wine sales | Its DTC platform |
| Brand awareness among people who do not use Vinnot | Vinnot only observes its own users | Brand health studies such as IWSR's ([Rural News Group](https://ruralnewsgroup.co.nz/wine-grower/wg-general-news/intel-and-insights-brand-health-tracking)) |
| Prediction of churn, club sign-up or customer lifetime value | It needs the winery's customer data | Models in its DTC platform |

Price positioning and audience age cannot be produced today either; they depend on the
[planned new data](#planned-new-data).

## Privacy and store policies

### The 10-person rule

Every published figure, whether a count or an average, must gather at least 10 people
**in each cell, after every filter is applied**. The minimum is necessary but not
enough: in small cohorts (a small winery, a province, an event) totals, averages and
the difference between two consecutive reports can re-identify people. The threshold
is also low against commercial minimums: LinkedIn requires audiences of 300 members
([LinkedIn](https://www.linkedin.com/help/lms/answer/106247)). So the rule is completed
with these safeguards, derived from Article 29 Working Party Opinion 05/2014
([WP216](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2014/wp216_en.pdf))
and from Google Analytics 4 practice
([Google](https://support.google.com/analytics/answer/9383630?hl=en)).

| Safeguard | What it prevents |
|---|---|
| Suppress or merge complementary cells | The total minus the visible cells revealing a cell with fewer than 10 people |
| Group region into province and time into month when the base is small | Singling out a person by place or date |
| Round counts (for example, to multiples of 5) and averages (to half a point), or add light noise, and check differences between consecutive reports | Deducing one person's rating by comparing two reports |
| Hide an attribute if every member of a cell shares it | Inferring an attribute of everyone in the cell |
| Never deliver review text with author data (region, tastes, exact date); deliver summarised themes | Re-identifying the author through the text, the highest-risk data |
| Never deliver individual taste vectors, lists of people or row-level exports | Rebuilding individual profiles |
| Exclude the winery's own staff accounts from the calculation | Staff ratings inflating or identifying a cohort |
| Contractually forbid the winery from trying to re-identify people or matching the reports with its CRM | Vinnot's joint liability if de-identification fails |

### Legal framework surveyed

Summary of the rules surveyed on 2026-11-06. It is not a legal opinion: the legal review
is **planned** from 2026-12-01 to 2026-12-19.

| Rule | What it sets | Effect on the reports |
|---|---|---|
| Law 25,326, art. 2 ([InfoLEG](https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm)) | Defines de-identification ("disociación"): processing that prevents linking data to a determined or determinable person | Reports must be de-identified in practice, not just aggregated |
| Law 25,326, art. 11, para. 3, e) | Disclosure needs no consent when a de-identification procedure makes the data subjects unidentifiable | If de-identification holds, delivering the report needs no consent from each person |
| Law 25,326, art. 11, para. 4 | The discloser and the recipient are jointly liable | If de-identification fails, Vinnot is liable together with the winery |
| Law 25,326, art. 28 | Excludes from the law statistics that cannot be attributed to a person | Reinforces the non-identifiability test |
| LGPD, art. 12 (Brazil) ([UFRGS](https://www.ufrgs.br/proprivacidade/anonimizacao)) | Excludes anonymised data unless anonymisation can be reversed with reasonable effort; treats as personal the data used to build the behavioural profile of an identified person | Never deliver individual profiles |
| WP216 (European users) | Assesses anonymisation by singling out, linkability and inference; aggregating over small groups eases inference | Grounds the safeguards in the table above |

Law 25,326 remains in force: the bill to replace it lost parliamentary status
([BDO Argentina](https://www.bdoargentina.com/es-ar/publicaciones/categoria-de-publicaciones/grupo-de-publicaciones/ley-de-proteccion-de-datos-personales-en-argentina-sus-principales-desafios-frente-al-avance-de-la)).
No AAIP resolution sets a minimum group size; the test is that nobody can be identified
in practice.

### Open risks with the stores

| Policy | Status | Detail |
|---|---|---|
| Apple, guideline 5.1.2 ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)) | Open risk | 5.1.2(i) limits sharing data the app collects with third parties to "improve the app or serve advertising"; 5.1.2(iii) forbids facilitating re-identification from data declared as aggregated. Selling reports to wineries is neither, and the text does not say whether non-personal aggregates count as data collected by the app |
| Google Play, User Data policy | Pending | Its text on sharing aggregated or anonymised data has not been checked yet |

Until the legal review concludes, the conservative reading is to treat the reports as
covered by guideline 5.1.2. Proposed measures, subject to that review (status:
**proposed target**): share only aggregates that meet 5.1.2(iii), declare it in the
[privacy policy](../modules/legal/README.md) and in the stores' privacy labels, notify
existing users before launch and offer an option to opt out of aggregated reports.

## Planned new data

Four new data points close the most valuable gaps in the catalogue. **Status:
planned**; the dates are in the [timeline](../gantt/README.md). Each one is collected
only after the privacy policy and the App Store and Google Play privacy labels are
updated.

| Data | How it is collected | Which report it enables |
|---|---|---|
| Age range | Optional and in broad ranges, in the profile | Audience age, as Untappd reports it ([Untappd](https://help.untappd.com/hc/en-us/articles/11365624716692-Beer-Report)); millennials are already the largest wine consumer cohort in the United States ([Wine Intelligence](https://wine-intelligence.com/blogs/wine-analytics-pricing-report-data/millennials-take-the-lead-as-the-largest-wine-consumer-group-in-the-u-s)) |
| Price paid and place of purchase | Optional, when rating a wine | Price positioning against the market, as Vivino and Wine-Searcher offer ([Wine-Searcher](https://www.wine-searcher.com/trade/data-reports)) |
| Internal searches | Aggregated logging of searches inside Vinnot | A search-based demand ranking, like the Wine Rank ([Wine-Searcher](https://www.wine-searcher.com/wine-rank)) |
| Event entry | Each ticket shows a QR code bound to its reference number; at the door, the organizer scans it from their phone and marks attendance | Attendance rate, which OrderPort treats as a leading indicator |

Today an event confirmation is made by the person about their own reserved seat
([`ConfirmEventAttendanceCommandHandler`](../../../backend/src/main/java/com/vinnot/event/application/command/handler/ConfirmEventAttendanceCommandHandler.java));
there is no entry record on the day of the event.

Age is not the best segmenter: the literature finds that involvement with wine segments
better
([Marketing Management Journal](https://marketingmanagementjournal.scholasticahq.com/article/157560-a-latent-class-segmentation-of-wine-drinkers-consumption)),
and that level can already be derived from behaviour in Vinnot.

## Validation

| Step | Status | What it validates |
|---|---|---|
| Pilot interviews with three wineries, from 2026-12-01 to 2026-12-12 | Planned | Which catalogue reports they find useful; the catalogue is adjusted with the result |
| Post-launch pilots that compare Vinnot interest signals with each winery's own sales | Planned, no date | Whether interest signals anticipate sales |

There is no published evidence that cellar additions, label scans or taste profiles
turn into sales. The accuracy figures available, such as the 93% Tastry claims for
predicting taste profiles, are the company's own claims
([Retail IT Insights](https://www.retailitinsights.com/doc/tastry-launches-tastry-uncorked-a-personalized-ai-recommender-for-e-commerce-0001)).
Until the pilots validate it, no report claims that a signal predicts a sale.

Two more limits are stated in the product:

- Vinnot users are enthusiasts who chose to use the app, not a representative sample of
  consumers.
- Community ratings agree with critics about 40% of the time for Bordeaux reds, against
  63% between critics
  ([The Drinks Business](https://www.thedrinksbusiness.com/2025/01/vivinos-crowd-reviews-gain-credibility-in-cambridge-study/)):
  they are more useful for young everyday wines than for wines meant for ageing.

No survey ranks quantitatively which metric wineries value most; the order of the
catalogue is an inference from what the platforms offer and from what wineries asked
Vivino for.

## Sources

Sources checked on 2026-11-06; each one is linked in the section where it is used.
