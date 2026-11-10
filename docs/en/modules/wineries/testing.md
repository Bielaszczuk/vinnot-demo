# Testing

Test cases of the module: one for the main flow of each use case and one for each alternative flow. They can be run by hand on the web and in the app; the automated tests column shows which tests exercise the use case.

## Test cases

| ID | Use case | Steps | Expected result |
|---|---|---|---|
| `CP-WRY-01` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | 1) The person opens a winery from a wine, a wine route or the app list. 2) The client calls `GET /wineries/{id}`. 3) The API returns the winery with its origin, contact, coordinates and number of active wines. 4) The client shows logo, name, location, founding year, description (in the interface language or, when missing, in the other one), website, email and phone. 5) The client shows a map with the coordinates or, when missing, with the address or the name. 6) It asks separately for the first page of 20 of the winery's wines and shows them in a grid that leads to each wine. | The winery's page is shown with its wines, its location and its contact details. |
| `CP-WRY-02` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Main flow → 3a. The winery does not exist | The API answers 404 and the client shows it was not found. |
| `CP-WRY-03` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Main flow → 5a. The winery has no coordinates | The client looks them up by geocoding with name, region and country, and asks to store them with `PATCH /wineries/{id}/coordinates`; the API only stores them when the viewer has the `WINERY_UPDATE` permission and the winery still has no coordinates. |
| `CP-WRY-04` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Main flow → 6a. The winery has no published wines | The empty state is shown. |
| `CP-WRY-05` | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | Main flow → 4a. The image is missing | A default image is shown; another field is missing: that block is not shown. |
| `CP-WRY-06` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | 1) The app shows the active wineries ordered by name. 2) The person types in the search box. 3) The app waits for 350 ms without changes and calls `GET /wineries` with the text and pages of 20. 4) The API searches for the text within each winery's name, legal name or SEO name. 5) The person picks a winery and the app opens its page ([UC-WRY-01](use-cases/uc-wry-01-view-winery.md)). | The active wineries matching the search are shown. |
| `CP-WRY-07` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Main flow → 2a. The person pulls down | The list reloads. |
| `CP-WRY-13` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Main flow → 2b. The person reaches the end of the list | The app appends the next page while the API says there are more. |
| `CP-WRY-08` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Main flow → 4a. There are no results | The empty state is shown. |
| `CP-WRY-09` | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | Main flow → 3a. A text longer than 512 characters answers 422 `INVALID_SEARCH`. | A text longer than 512 characters answers 422 `INVALID_SEARCH`. |
| `CP-WRY-10` | [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | 1) The client asks for the list of countries. 2) The person picks a country. 3) The client asks for that country's regions. 4) The person picks a region. | The picker offers the countries and the regions of the chosen country. |
| `CP-WRY-11` | [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | Main flow → 2a. The person changes the country | The chosen region is cleared and the new country's are loaded. |
| `CP-WRY-12` | [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | Main flow → 3a. The country has no regions or does not exist | The API returns an empty list. |

## Traceability matrix

| Use case | Requirements | Test cases | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | RF-WEB-WRY-01, RF-WEB-WRY-02, RF-WEB-WRY-03, RF-WEB-WRY-04, RF-APK-WRY-01, RF-APK-WRY-02, RF-APK-WRY-03, RF-APK-WRY-04 | CP-WRY-01, CP-WRY-02, CP-WRY-03, CP-WRY-04, CP-WRY-05 | 3 | 3 | 4 |
| [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | RF-APK-WRY-05 | CP-WRY-06, CP-WRY-07, CP-WRY-13, CP-WRY-08, CP-WRY-09 | 3 | n/a | 1 |
| [`UC-WRY-03`](use-cases/uc-wry-03-countries-and-regions.md) | — | CP-WRY-10, CP-WRY-11, CP-WRY-12 | 3 | 1 | 1 |

The Backend, Web and App columns count the test files that exercise the case; the detail is in each use case. "n/a" means the case does not apply to that platform.
