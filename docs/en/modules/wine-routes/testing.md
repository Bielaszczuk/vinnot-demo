# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-RTE-01` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | 1) The person opens Wine routes. 2) The client calls `GET /wine-routes`, 20 routes at a time. 3) The API returns only published routes. 4) The client shows each route with cover, country, region, length, number of stops, distance and duration. 5) The person filters by text, length, country or region. | The person sees the published routes and can filter them. |
| `CP-RTE-02` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | Main flow → 5a. Filters apply to the routes already loaded | On the web, to the current page; on the app, to the pages accumulated with “Load more”. |
| `CP-RTE-03` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | Main flow → 3a. There are no routes | The empty state is shown. |
| `CP-RTE-04` | [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | Main flow → 2a. More than 100 per page or a text longer than 512 characters | The API answers 422. |
| `CP-RTE-05` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | 1) The client calls `GET /wine-routes/{id}`. 2) The API returns the route with its ordered stops and, for winery stops, the data of the winery with the same name. 3) The client shows cover, description, length, distance, duration and recommended wine types. 4) It shows the stops on a timeline; each stop expands with its description, address and contacts. | The person sees the route with its stops in order. |
| `CP-RTE-06` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Main flow → 2a. The route is not published and the reader did not create it and is not a moderator or administrator | The API answers 404. |
| `CP-RTE-07` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Main flow → 3a. The stops have a duration | The total duration is the sum of the stops; otherwise the route's estimate in minutes is used. |
| `CP-RTE-13` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Main flow → 3b. Neither the stops nor the route have a duration in minutes | The estimate in days is shown (“N days”); with neither, the web shows “—” and the app shows no duration. |
| `CP-RTE-14` | [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | Main flow → 3c. The route has no length | No length label is shown. |
| `CP-RTE-08` | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | 1) The person sees the stops on a map: on the web, the route's embedded map; on the app, a map with one marker per stop. 2) They choose to open a stop in maps: the client builds the Google Maps address with its coordinates or its address. 3) Or they choose to navigate the full route: the client builds a Google Maps driving trip with origin, destination and intermediate stops in order. 4) The system opens the maps app or page. | The maps app opens the stop or the full trip. |
| `CP-RTE-09` | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | Main flow → 3a. The route has no stops | Navigation is disabled. |
| `CP-RTE-10` | [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | Main flow → 4a. The system cannot open the link | The app shows a notice. |
| `CP-RTE-11` | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | 1) The person chooses “Share”. 2) The client builds the route's public link and opens the system share sheet or copies the link ([Sharing](../sharing/README.md)). 3) Or the person chooses “Report” and follows the reporting flow ([Community](../community/README.md)). | The route was shared or reported. |
| `CP-RTE-15` | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | Main flow → 1a. The route is not published (draft or archived, visible only to its creator and the team) | “Share” is not offered. |
| `CP-RTE-12` | [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | Main flow → 3a. The person cancels the report | Nothing is sent. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-RTE-01`](use-cases/uc-rte-01-browse-routes.md) | RF-WEB-RTE-01, RF-WEB-RTE-02, RF-APK-RTE-01, RF-APK-RTE-02 | CP-RTE-01, CP-RTE-02, CP-RTE-03, CP-RTE-04 | 1 | 2 | 3 |
| [`UC-RTE-02`](use-cases/uc-rte-02-view-route.md) | RF-WEB-RTE-03, RF-WEB-RTE-04, RF-APK-RTE-03, RF-APK-RTE-04 | CP-RTE-05, CP-RTE-06, CP-RTE-07, CP-RTE-13, CP-RTE-14 | 3 | 2 | 2 |
| [`UC-RTE-03`](use-cases/uc-rte-03-navigate-stops.md) | RF-WEB-RTE-05, RF-WEB-RTE-06, RF-APK-RTE-05, RF-APK-RTE-06 | CP-RTE-08, CP-RTE-09, CP-RTE-10 | 0 | 0 | 3 |
| [`UC-RTE-04`](use-cases/uc-rte-04-share-or-report-route.md) | RF-WEB-RTE-07, RF-APK-RTE-07 | CP-RTE-11, CP-RTE-15, CP-RTE-12 | 0 | 3 | 3 |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.
