# Functional requirements

Functional requirements of the module, split by platform. The "Previous ID" column keeps the identifier they had in the per-platform specification.

## Web

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-WEB-WRY-01` | Open a winery detail. | Identity, description, origin, image, year and contacts appear when present; this is distinct from the personal cellar. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-001` |
| `RF-WEB-WRY-02` | Read related wines. | The detail queries the first page of twenty wines from that winery; it does not claim to load the entire winery catalogue. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-002` |
| `RF-WEB-WRY-03` | Read location and contact actions. | Coordinates or address enable a map and existing contact links; geocoding does not guarantee permission to persist changes. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-003` |
| `RF-WEB-WRY-04` | Keep related-data errors separate. | Winery and wine reads are distinct operations; missing images use a fallback rather than imply a missing entity. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-WEB-WINERY-004` |

## APK

| ID | Requirement | Acceptance criterion | Use case | Previous ID |
|---|---|---|---|---|
| `RF-APK-WRY-01` | Open a winery detail. | Identity, description, origin, image, year and contacts appear when present; this is distinct from the personal cellar. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-001` |
| `RF-APK-WRY-02` | Read related wines. | The detail queries the first page of twenty wines from that winery; it does not claim to load the entire winery catalogue. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-002` |
| `RF-APK-WRY-03` | Read location and contact actions. | Coordinates or address enable a map and existing contact links; geocoding does not guarantee permission to persist changes. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-003` |
| `RF-APK-WRY-04` | Keep related-data errors separate. | Winery and wine reads are distinct operations; missing images use a fallback rather than imply a missing entity. | [`UC-WRY-01`](use-cases/uc-wry-01-view-winery.md) | `RF-APK-WINERY-004` |
| `RF-APK-WRY-05` | Read the additional winery list. | /wineries supports list/search and detail; it is distinct from a public winery-index web route. | [`UC-WRY-02`](use-cases/uc-wry-02-search-wineries.md) | `RF-APK-APKX-012` |
