# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-RTE-01` | Browse routes using exposed criteria. | Text, country, region and short/medium/long length refine results; length is not a physical difficulty certification. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-WEB-ROUTE-001` |
| `RF-WEB-RTE-02` | Refine routes within the received page. | Routes criteria filter one page of twenty locally; totals/pages remain server totals rather than global filtered totals. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-WEB-WEBX-004` |
| `RF-WEB-RTE-03` | Open route details. | Shows available cover/fallback, name, description, origin, distance, duration (in minutes or, when there is only an estimate in days, in days) and stop count; the length is hidden when the route has none. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-WEB-ROUTE-002` |
| `RF-WEB-RTE-04` | View ordered stops and expand information. | Each stop shows available order, type, address, duration, description and contact; expanding does not modify the route. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-WEB-ROUTE-003` |
| `RF-WEB-RTE-05` | Open a stop map and external route directions. | Uses coordinates or address/name; starting directions retains order, origin, destination and intermediate stops in Maps. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-WEB-ROUTE-004` |
| `RF-WEB-RTE-06` | Keep exploration distinct from tourism tracking. | Opening maps/stops does not automatically record route completion or provide Vinnot's own GPS navigation. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-WEB-ROUTE-006` |
| `RF-WEB-RTE-07` | Share and report routes. | Sharing uses route UUID and reporting uses WINE_ROUTE; only PUBLISHED routes have a public share page, and only they offer “Share”. | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | `RF-WEB-ROUTE-005` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-RTE-01` | Browse routes using exposed criteria. | Text, country, region and short/medium/long length refine results; length is not a physical difficulty certification. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-APK-ROUTE-001` |
| `RF-APK-RTE-02` | Refine routes in accumulated pages and load more. | Text/length/country/region filter loaded pages, not a global search; load more deduplicates UUID and refresh returns to page zero. | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | `RF-APK-APKX-010` |
| `RF-APK-RTE-03` | Open route details. | Shows available cover/fallback, name, description, origin, distance, duration (in minutes or, when there is only an estimate in days, in days) and stop count; the length is hidden when the route has none. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-APK-ROUTE-002` |
| `RF-APK-RTE-04` | View ordered stops and expand information. | Each stop shows available order, type, address, duration, description and contact; expanding does not modify the route. | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | `RF-APK-ROUTE-003` |
| `RF-APK-RTE-05` | Open a stop map and external route directions. | Uses coordinates or address/name; starting directions retains order, origin, destination and intermediate stops in Maps. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-APK-ROUTE-004` |
| `RF-APK-RTE-06` | Keep exploration distinct from tourism tracking. | Opening maps/stops does not automatically record route completion or provide Vinnot's own GPS navigation. | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | `RF-APK-ROUTE-006` |
| `RF-APK-RTE-07` | Share and report routes. | Sharing uses route UUID and reporting uses WINE_ROUTE; only PUBLISHED routes have a public share page, and only they offer “Share”. | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | `RF-APK-ROUTE-005` |
