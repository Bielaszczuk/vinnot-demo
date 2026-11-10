# Matriz de trazabilidad global

Une cada caso de uso con sus requisitos web y APK, sus casos de prueba y la cantidad de
tests automáticos de backend, web y app que lo cubren. Cada módulo tiene su propia matriz en
su página de pruebas; esta página las junta. Un mismo test puede cubrir varios casos de uso,
por eso los totales de tests cuentan referencias, no archivos.

## Resumen

| Módulo | Casos de uso | Requisitos web | Requisitos APK | Casos de prueba | Tests backend | Tests web | Tests app |
|---|---|---|---|---|---|---|---|
| [Usuarios y cuenta](users/README.md) | 23 | 30 | 35 | 68 | 59 | 34 | 44 |
| [Legal](legal/README.md) | 8 | 7 | 7 | 27 | 18 | 11 | 11 |
| [Vinos](wines/README.md) | 9 | 12 | 23 | 43 | 28 | 11 | 20 |
| [Bodegas y regiones](wineries/README.md) | 3 | 4 | 5 | 13 | 8 | 4 | 6 |
| [Reseñas](reviews/README.md) | 7 | 10 | 10 | 33 | 24 | 10 | 10 |
| [Cava](cellar/README.md) | 6 | 7 | 8 | 26 | 13 | 11 | 8 |
| [Comunidad](community/README.md) | 4 | 4 | 4 | 21 | 12 | 8 | 4 |
| [Eventos y entradas](events/README.md) | 9 | 16 | 15 | 46 | 30 | 21 | 15 |
| [Pagos](payments/README.md) | 6 | 3 | 2 | 30 | 32 | 12 | 12 |
| [Rutas del vino](wine-routes/README.md) | 4 | 7 | 7 | 15 | 4 | 7 | 11 |
| [Compartir](sharing/README.md) | 3 | 7 | 8 | 15 | 4 | 5 | 5 |
| [Notificaciones](notifications/README.md) | 7 | 9 | 14 | 43 | 58 | 5 | 28 |
| [Actividad](activity/README.md) | 3 | 0 | 4 | 15 | 11 | 0 | 8 |
| [Puntos y sellos](gamification/README.md) | 4 | 8 | 9 | 24 | 24 | 15 | 17 |
| [Perfiles y comparaciones IA](ai/README.md) | 4 | 8 | 10 | 20 | 20 | 5 | 8 |
| [Marketing en redes](marketing/README.md) | 10 | 31 | 3 | 66 | 108 | 56 | 19 |
| [Soporte e información pública](support/README.md) | 3 | 5 | 5 | 10 | 6 | 8 | 7 |
| [Partners](partner/README.md) | 6 | 7 | 7 | 23 | 12 | 12 | 14 |
| [Administración y moderación](admin/README.md) | 15 | 33 | 33 | 63 | 56 | 39 | 34 |
| **Total** | **134** | **208** | **209** | **601** | **527** | **274** | **281** |

## Usuarios y cuenta

La matriz del módulo está en [Pruebas](users/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-USR-01`](users/use-cases/uc-usr-01-sign-up.md) | RF-WEB-USR-01, RF-WEB-USR-02, RF-WEB-USR-03, RF-APK-USR-01, RF-APK-USR-02, RF-APK-USR-03 | CP-USR-01, CP-USR-02, CP-USR-03, CP-USR-04 | 5 | 3 | 2 |
| [`UC-USR-02`](users/use-cases/uc-usr-02-verify-email.md) | RF-WEB-USR-04, RF-APK-USR-04 | CP-USR-05, CP-USR-06, CP-USR-07 | 5 | 0 | 1 |
| [`UC-USR-03`](users/use-cases/uc-usr-03-sign-in.md) | RF-WEB-USR-05, RF-WEB-USR-06, RF-APK-USR-05, RF-APK-USR-06 | CP-USR-08, CP-USR-09, CP-USR-10, CP-USR-11, CP-USR-12, CP-USR-67 | 5 | 5 | 3 |
| [`UC-USR-04`](users/use-cases/uc-usr-04-social-sign-in.md) | RF-WEB-USR-07, RF-WEB-USR-08, RF-APK-USR-07, RF-APK-USR-08, RF-APK-USR-09, RF-APK-USR-10 | CP-USR-13, CP-USR-14, CP-USR-15, CP-USR-16 | 4 | 2 | 3 |
| [`UC-USR-05`](users/use-cases/uc-usr-05-complete-profile.md) | RF-WEB-USR-09, RF-APK-USR-11 | CP-USR-17, CP-USR-18 | 1 | 0 | 2 |
| [`UC-USR-06`](users/use-cases/uc-usr-06-restore-session.md) | RF-WEB-USR-10, RF-WEB-USR-11, RF-APK-USR-12, RF-APK-USR-13 | CP-USR-19, CP-USR-20, CP-USR-21, CP-USR-22 | 5 | 4 | 5 |
| [`UC-USR-07`](users/use-cases/uc-usr-07-resume-protected-destination.md) | RF-WEB-USR-12, RF-APK-USR-14 | CP-USR-23, CP-USR-24 | 1 | 2 | 4 |
| [`UC-USR-08`](users/use-cases/uc-usr-08-sign-out.md) | RF-WEB-USR-13, RF-APK-USR-15 | CP-USR-25, CP-USR-26 | 2 | 2 | 2 |
| [`UC-USR-09`](users/use-cases/uc-usr-09-request-password-recovery.md) | RF-WEB-USR-14, RF-APK-USR-16 | CP-USR-27, CP-USR-28 | 2 | 1 | 0 |
| [`UC-USR-10`](users/use-cases/uc-usr-10-reset-password.md) | RF-WEB-USR-15, RF-APK-USR-17 | CP-USR-29, CP-USR-30, CP-USR-31 | 3 | 0 | 2 |
| [`UC-USR-11`](users/use-cases/uc-usr-11-confirm-email-change.md) | RF-WEB-USR-16 | CP-USR-32, CP-USR-33 | 2 | 0 | n/a |
| [`UC-USR-12`](users/use-cases/uc-usr-12-reauthenticate.md) | — | CP-USR-34, CP-USR-35, CP-USR-36 | 5 | 3 | 2 |
| [`UC-USR-13`](users/use-cases/uc-usr-13-view-profile.md) | RF-WEB-USR-17, RF-WEB-USR-18, RF-APK-USR-18, RF-APK-USR-19, RF-APK-USR-20 | CP-USR-37 | 1 | 1 | 2 |
| [`UC-USR-14`](users/use-cases/uc-usr-14-edit-profile.md) | RF-WEB-USR-19, RF-APK-USR-21 | CP-USR-38, CP-USR-39, CP-USR-40, CP-USR-41 | 3 | 2 | 1 |
| [`UC-USR-15`](users/use-cases/uc-usr-15-change-avatar.md) | RF-WEB-USR-20, RF-APK-USR-22 | CP-USR-42, CP-USR-43, CP-USR-44, CP-USR-45 | 1 | 1 | 2 |
| [`UC-USR-16`](users/use-cases/uc-usr-16-change-password.md) | RF-WEB-USR-21, RF-APK-USR-23 | CP-USR-46, CP-USR-47, CP-USR-48, CP-USR-68 | 4 | 2 | 1 |
| [`UC-USR-17`](users/use-cases/uc-usr-17-request-email-change.md) | RF-WEB-USR-22, RF-APK-USR-24 | CP-USR-49, CP-USR-50 | 1 | 2 | 1 |
| [`UC-USR-18`](users/use-cases/uc-usr-18-deactivate-account.md) | RF-WEB-USR-23, RF-APK-USR-25 | CP-USR-51, CP-USR-52, CP-USR-53 | 3 | 1 | 2 |
| [`UC-USR-19`](users/use-cases/uc-usr-19-delete-account.md) | RF-WEB-USR-24, RF-WEB-USR-25, RF-WEB-USR-26, RF-APK-USR-26, RF-APK-USR-27, RF-APK-USR-28 | CP-USR-54, CP-USR-55, CP-USR-56, CP-USR-57, CP-USR-69 | 4 | 2 | 3 |
| [`UC-USR-20`](users/use-cases/uc-usr-20-change-language.md) | RF-WEB-USR-27, RF-APK-USR-29 | CP-USR-58, CP-USR-59, CP-USR-60 | 4 | 2 | 2 |
| [`UC-USR-21`](users/use-cases/uc-usr-21-welcome.md) | RF-APK-USR-30 | CP-USR-61 | 0 | n/a | 2 |
| [`UC-USR-22`](users/use-cases/uc-usr-22-home.md) | RF-WEB-USR-28, RF-APK-USR-31, RF-APK-USR-32, RF-APK-USR-33, RF-APK-USR-34 | CP-USR-62, CP-USR-63, CP-USR-64 | 0 | 0 | 1 |
| [`UC-USR-23`](users/use-cases/uc-usr-23-navigate.md) | RF-WEB-USR-29, RF-WEB-USR-30, RF-APK-USR-35 | CP-USR-65, CP-USR-66 | 0 | 0 | 2 |

## Legal

La matriz del módulo está en [Pruebas](legal/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-LEG-01`](legal/use-cases/uc-leg-01-legal-centre.md) | RF-WEB-LEG-01, RF-APK-LEG-01 | CP-LEG-01, CP-LEG-02 | 2 | 1 | 1 |
| [`UC-LEG-02`](legal/use-cases/uc-leg-02-accept-at-sign-up.md) | RF-WEB-LEG-02, RF-APK-LEG-02 | CP-LEG-03, CP-LEG-04, CP-LEG-05, CP-LEG-06, CP-LEG-07 | 3 | 3 | 3 |
| [`UC-LEG-03`](legal/use-cases/uc-leg-03-check-acceptance.md) | RF-WEB-LEG-03, RF-APK-LEG-03 | CP-LEG-08, CP-LEG-09, CP-LEG-10, CP-LEG-11 | 2 | 3 | 3 |
| [`UC-LEG-04`](legal/use-cases/uc-leg-04-accept-current-version.md) | RF-WEB-LEG-04, RF-WEB-LEG-05, RF-WEB-LEG-06, RF-APK-LEG-04, RF-APK-LEG-05, RF-APK-LEG-06 | CP-LEG-12, CP-LEG-13, CP-LEG-14, CP-LEG-15 | 4 | 3 | 3 |
| [`UC-LEG-05`](legal/use-cases/uc-leg-05-decline-and-sign-out.md) | RF-WEB-LEG-07, RF-APK-LEG-07 | CP-LEG-16, CP-LEG-17 | 0 | 1 | 1 |
| [`UC-LEG-06`](legal/use-cases/uc-leg-06-announce-terms-update.md) | — | CP-LEG-18, CP-LEG-19, CP-LEG-20 | 3 | n/a | n/a |
| [`UC-LEG-07`](legal/use-cases/uc-leg-07-enforce-acceptance.md) | — | CP-LEG-21, CP-LEG-22, CP-LEG-23, CP-LEG-24 | 2 | n/a | n/a |
| [`UC-LEG-08`](legal/use-cases/uc-leg-08-publish-terms-version.md) | — | CP-LEG-25, CP-LEG-26, CP-LEG-27 | 2 | n/a | n/a |

## Vinos

La matriz del módulo está en [Pruebas](wines/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-WIN-01`](wines/use-cases/uc-win-01-search-catalog.md) | RF-WEB-WIN-01, RF-WEB-WIN-02, RF-WEB-WIN-03, RF-WEB-WIN-04, RF-WEB-WIN-05, RF-APK-WIN-01, RF-APK-WIN-02, RF-APK-WIN-03, RF-APK-WIN-04, RF-APK-WIN-05 | CP-WIN-01, CP-WIN-02, CP-WIN-03, CP-WIN-04, CP-WIN-05, CP-WIN-06, CP-WIN-07, CP-WIN-08 | 5 | 5 | 3 |
| [`UC-WIN-02`](wines/use-cases/uc-win-02-page-catalog.md) | RF-WEB-WIN-06, RF-WEB-WIN-07, RF-WEB-WIN-08, RF-APK-WIN-06, RF-APK-WIN-07, RF-APK-WIN-08 | CP-WIN-09, CP-WIN-10, CP-WIN-11, CP-WIN-12, CP-WIN-13, CP-WIN-14 | 2 | 2 | 1 |
| [`UC-WIN-03`](wines/use-cases/uc-win-03-view-wine-detail.md) | RF-WEB-WIN-09, RF-WEB-WIN-10, RF-WEB-WIN-11, RF-APK-WIN-09, RF-APK-WIN-10, RF-APK-WIN-11 | CP-WIN-15, CP-WIN-16, CP-WIN-17 | 3 | 3 | 3 |
| [`UC-WIN-04`](wines/use-cases/uc-win-04-scan-invitation.md) | RF-WEB-WIN-12 | CP-WIN-18 | 0 | 1 | n/a |
| [`UC-WIN-05`](wines/use-cases/uc-win-05-scan-label.md) | RF-APK-WIN-12, RF-APK-WIN-13, RF-APK-WIN-14, RF-APK-WIN-15, RF-APK-WIN-16, RF-APK-WIN-17, RF-APK-WIN-18 | CP-WIN-19, CP-WIN-20, CP-WIN-21, CP-WIN-22, CP-WIN-23, CP-WIN-24, CP-WIN-25, CP-WIN-42 | 8 | n/a | 7 |
| [`UC-WIN-06`](wines/use-cases/uc-win-06-manual-search-from-scan.md) | RF-APK-WIN-19 | CP-WIN-26, CP-WIN-27, CP-WIN-28 | 1 | n/a | 1 |
| [`UC-WIN-07`](wines/use-cases/uc-win-07-submit-wine.md) | RF-APK-WIN-20, RF-APK-WIN-21 | CP-WIN-29, CP-WIN-30, CP-WIN-31, CP-WIN-32, CP-WIN-33, CP-WIN-43 | 4 | n/a | 4 |
| [`UC-WIN-08`](wines/use-cases/uc-win-08-attach-label-photo.md) | RF-APK-WIN-22 | CP-WIN-34, CP-WIN-35, CP-WIN-36, CP-WIN-37, CP-WIN-38 | 2 | n/a | 1 |
| [`UC-WIN-09`](wines/use-cases/uc-win-09-track-submissions.md) | RF-APK-WIN-23 | CP-WIN-39, CP-WIN-40, CP-WIN-41 | 3 | n/a | 0 |

## Bodegas y regiones

La matriz del módulo está en [Pruebas](wineries/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-WRY-01`](wineries/use-cases/uc-wry-01-view-winery.md) | RF-WEB-WRY-01, RF-WEB-WRY-02, RF-WEB-WRY-03, RF-WEB-WRY-04, RF-APK-WRY-01, RF-APK-WRY-02, RF-APK-WRY-03, RF-APK-WRY-04 | CP-WRY-01, CP-WRY-02, CP-WRY-03, CP-WRY-04, CP-WRY-05 | 3 | 3 | 4 |
| [`UC-WRY-02`](wineries/use-cases/uc-wry-02-search-wineries.md) | RF-APK-WRY-05 | CP-WRY-06, CP-WRY-07, CP-WRY-13, CP-WRY-08, CP-WRY-09 | 2 | n/a | 1 |
| [`UC-WRY-03`](wineries/use-cases/uc-wry-03-countries-and-regions.md) | — | CP-WRY-10, CP-WRY-11, CP-WRY-12 | 3 | 1 | 1 |

## Reseñas

La matriz del módulo está en [Pruebas](reviews/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-REV-01`](reviews/use-cases/uc-rev-01-read-reviews.md) | RF-WEB-REV-01, RF-WEB-REV-02, RF-APK-REV-01, RF-APK-REV-02 | CP-REV-01, CP-REV-02, CP-REV-03, CP-REV-04, CP-REV-33 | 4 | 4 | 3 |
| [`UC-REV-02`](reviews/use-cases/uc-rev-02-publish-review.md) | RF-WEB-REV-03, RF-WEB-REV-04, RF-APK-REV-03, RF-APK-REV-04 | CP-REV-05, CP-REV-06, CP-REV-07, CP-REV-08, CP-REV-32 | 5 | 2 | 3 |
| [`UC-REV-03`](reviews/use-cases/uc-rev-03-edit-review.md) | RF-WEB-REV-05, RF-APK-REV-05 | CP-REV-09, CP-REV-10, CP-REV-11, CP-REV-12, CP-REV-13 | 3 | 1 | 1 |
| [`UC-REV-04`](reviews/use-cases/uc-rev-04-delete-review.md) | RF-WEB-REV-06, RF-APK-REV-06 | CP-REV-14, CP-REV-15, CP-REV-16, CP-REV-17, CP-REV-18 | 2 | 1 | 1 |
| [`UC-REV-05`](reviews/use-cases/uc-rev-05-like-review.md) | RF-WEB-REV-07, RF-APK-REV-07 | CP-REV-19, CP-REV-20, CP-REV-21, CP-REV-22 | 2 | 1 | 1 |
| [`UC-REV-06`](reviews/use-cases/uc-rev-06-review-comments.md) | RF-WEB-REV-08, RF-WEB-REV-09, RF-WEB-REV-10, RF-APK-REV-08, RF-APK-REV-09, RF-APK-REV-10 | CP-REV-23, CP-REV-24, CP-REV-25, CP-REV-26, CP-REV-27 | 3 | 1 | 1 |
| [`UC-REV-07`](reviews/use-cases/uc-rev-07-activity-notices.md) | — | CP-REV-28, CP-REV-29, CP-REV-30, CP-REV-31 | 5 | n/a | n/a |

## Cava

La matriz del módulo está en [Pruebas](cellar/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-CEL-01`](cellar/use-cases/uc-cel-01-view-cellar.md) | RF-WEB-CEL-01, RF-WEB-CEL-02, RF-WEB-CEL-03, RF-APK-CEL-01, RF-APK-CEL-02, RF-APK-CEL-03, RF-APK-CEL-04 | CP-CEL-01, CP-CEL-02, CP-CEL-03, CP-CEL-04, CP-CEL-05 | 3 | 3 | 3 |
| [`UC-CEL-02`](cellar/use-cases/uc-cel-02-add-wine.md) | RF-WEB-CEL-04, RF-APK-CEL-05 | CP-CEL-06, CP-CEL-07, CP-CEL-08, CP-CEL-26, CP-CEL-09 | 2 | 3 | 2 |
| [`UC-CEL-03`](cellar/use-cases/uc-cel-03-edit-entry.md) | RF-WEB-CEL-05, RF-APK-CEL-06 | CP-CEL-10, CP-CEL-11, CP-CEL-12, CP-CEL-13, CP-CEL-14 | 3 | 1 | 1 |
| [`UC-CEL-04`](cellar/use-cases/uc-cel-04-remove-entry.md) | RF-WEB-CEL-06, RF-APK-CEL-07 | CP-CEL-15, CP-CEL-16, CP-CEL-17, CP-CEL-18 | 2 | 3 | 1 |
| [`UC-CEL-05`](cellar/use-cases/uc-cel-05-publish-note-as-review.md) | RF-WEB-CEL-07, RF-APK-CEL-08 | CP-CEL-19, CP-CEL-20, CP-CEL-21, CP-CEL-22 | 1 | 1 | 1 |
| [`UC-CEL-06`](cellar/use-cases/uc-cel-06-cellar-statistics.md) | — | CP-CEL-23, CP-CEL-24, CP-CEL-25 | 2 | n/a | n/a |

## Comunidad

La matriz del módulo está en [Pruebas](community/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-COM-01`](community/use-cases/uc-com-01-report-content.md) | RF-WEB-COM-01, RF-WEB-COM-02, RF-APK-COM-01, RF-APK-COM-02 | CP-COM-01, CP-COM-02, CP-COM-03, CP-COM-04, CP-COM-05, CP-COM-06, CP-COM-07, CP-COM-08 | 4 | 4 | 2 |
| [`UC-COM-02`](community/use-cases/uc-com-02-block-user.md) | RF-WEB-COM-03, RF-APK-COM-03 | CP-COM-09, CP-COM-10, CP-COM-11, CP-COM-12, CP-COM-13, CP-COM-14 | 2 | 2 | 1 |
| [`UC-COM-03`](community/use-cases/uc-com-03-my-community.md) | RF-WEB-COM-04, RF-APK-COM-04 | CP-COM-15, CP-COM-16, CP-COM-17, CP-COM-18 | 2 | 2 | 1 |
| [`UC-COM-04`](community/use-cases/uc-com-04-report-outcome-and-retention.md) | — | CP-COM-19, CP-COM-20, CP-COM-21 | 4 | n/a | n/a |

## Eventos y entradas

La matriz del módulo está en [Pruebas](events/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-EVT-01`](events/use-cases/uc-evt-01-discover-events.md) | RF-WEB-EVT-01, RF-WEB-EVT-02, RF-WEB-EVT-03, RF-WEB-EVT-04, RF-APK-EVT-01, RF-APK-EVT-02, RF-APK-EVT-03, RF-APK-EVT-04 | CP-EVT-01, CP-EVT-02, CP-EVT-03, CP-EVT-04, CP-EVT-05, CP-EVT-06 | 4 | 3 | 2 |
| [`UC-EVT-02`](events/use-cases/uc-evt-02-view-event.md) | RF-WEB-EVT-05, RF-WEB-EVT-06, RF-WEB-EVT-07, RF-APK-EVT-05, RF-APK-EVT-06, RF-APK-EVT-07 | CP-EVT-07, CP-EVT-08, CP-EVT-09, CP-EVT-10, CP-EVT-46 | 1 | 6 | 3 |
| [`UC-EVT-03`](events/use-cases/uc-evt-03-register-for-event.md) | RF-WEB-EVT-08, RF-WEB-EVT-09, RF-WEB-EVT-10, RF-WEB-EVT-11, RF-WEB-EVT-12, RF-APK-EVT-08, RF-APK-EVT-09, RF-APK-EVT-10, RF-APK-EVT-11, RF-APK-EVT-12 | CP-EVT-11, CP-EVT-12, CP-EVT-13, CP-EVT-14, CP-EVT-15, CP-EVT-16, CP-EVT-17, CP-EVT-18, CP-EVT-19, CP-EVT-20 | 5 | 3 | 3 |
| [`UC-EVT-04`](events/use-cases/uc-evt-04-confirm-attendance.md) | RF-WEB-EVT-13, RF-APK-EVT-13 | CP-EVT-21, CP-EVT-22, CP-EVT-23, CP-EVT-24 | 2 | 1 | 1 |
| [`UC-EVT-05`](events/use-cases/uc-evt-05-cancel-registration.md) | RF-WEB-EVT-14, RF-APK-EVT-14 | CP-EVT-25, CP-EVT-26, CP-EVT-27, CP-EVT-28 | 2 | 2 | 1 |
| [`UC-EVT-06`](events/use-cases/uc-evt-06-my-tickets.md) | RF-WEB-EVT-15 | CP-EVT-29, CP-EVT-30, CP-EVT-31, CP-EVT-32 | 1 | 2 | 2 |
| [`UC-EVT-07`](events/use-cases/uc-evt-07-event-area.md) | RF-WEB-EVT-16, RF-APK-EVT-15 | CP-EVT-33, CP-EVT-34, CP-EVT-35, CP-EVT-36, CP-EVT-37 | 4 | 4 | 3 |
| [`UC-EVT-08`](events/use-cases/uc-evt-08-event-lifecycle.md) | — | CP-EVT-38, CP-EVT-39, CP-EVT-40 | 3 | n/a | n/a |
| [`UC-EVT-09`](events/use-cases/uc-evt-09-attendee-notices.md) | — | CP-EVT-41, CP-EVT-42, CP-EVT-43, CP-EVT-44, CP-EVT-45 | 8 | n/a | n/a |

## Pagos

La matriz del módulo está en [Pruebas](payments/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-PAY-01`](payments/use-cases/uc-pay-01-pay-registration.md) | RF-WEB-PAY-01, RF-APK-PAY-01 | CP-PAY-01, CP-PAY-02, CP-PAY-03, CP-PAY-04, CP-PAY-05 | 8 | 3 | 3 |
| [`UC-PAY-02`](payments/use-cases/uc-pay-02-checkout-return.md) | RF-WEB-PAY-02 | CP-PAY-06, CP-PAY-07, CP-PAY-08, CP-PAY-09 | 2 | 3 | 3 |
| [`UC-PAY-03`](payments/use-cases/uc-pay-03-link-payment-account.md) | — | CP-PAY-10, CP-PAY-11, CP-PAY-12, CP-PAY-13, CP-PAY-14 | 5 | 4 | 4 |
| [`UC-PAY-04`](payments/use-cases/uc-pay-04-refund-registration.md) | RF-WEB-PAY-03, RF-APK-PAY-02 | CP-PAY-15, CP-PAY-16, CP-PAY-17, CP-PAY-18, CP-PAY-28 | 5 | 2 | 2 |
| [`UC-PAY-05`](payments/use-cases/uc-pay-05-confirm-and-reconcile.md) | — | CP-PAY-19, CP-PAY-20, CP-PAY-21, CP-PAY-22, CP-PAY-23, CP-PAY-24, CP-PAY-29, CP-PAY-30 | 9 | n/a | n/a |
| [`UC-PAY-06`](payments/use-cases/uc-pay-06-renew-credentials.md) | — | CP-PAY-25, CP-PAY-26, CP-PAY-27 | 3 | n/a | n/a |

## Rutas del vino

La matriz del módulo está en [Pruebas](wine-routes/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-RTE-01`](wine-routes/use-cases/uc-rte-01-browse-routes.md) | RF-WEB-RTE-01, RF-WEB-RTE-02, RF-APK-RTE-01, RF-APK-RTE-02 | CP-RTE-01, CP-RTE-02, CP-RTE-03, CP-RTE-04 | 1 | 2 | 3 |
| [`UC-RTE-02`](wine-routes/use-cases/uc-rte-02-view-route.md) | RF-WEB-RTE-03, RF-WEB-RTE-04, RF-APK-RTE-03, RF-APK-RTE-04 | CP-RTE-05, CP-RTE-06, CP-RTE-07, CP-RTE-13, CP-RTE-14 | 3 | 2 | 2 |
| [`UC-RTE-03`](wine-routes/use-cases/uc-rte-03-navigate-stops.md) | RF-WEB-RTE-05, RF-WEB-RTE-06, RF-APK-RTE-05, RF-APK-RTE-06 | CP-RTE-08, CP-RTE-09, CP-RTE-10 | 0 | 0 | 3 |
| [`UC-RTE-04`](wine-routes/use-cases/uc-rte-04-share-or-report-route.md) | RF-WEB-RTE-07, RF-APK-RTE-07 | CP-RTE-11, CP-RTE-15, CP-RTE-12 | 0 | 3 | 3 |

## Compartir

La matriz del módulo está en [Pruebas](sharing/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-SHR-01`](sharing/use-cases/uc-shr-01-share-content.md) | RF-WEB-SHR-01, RF-WEB-SHR-02, RF-APK-SHR-01, RF-APK-SHR-02 | CP-SHR-01, CP-SHR-15, CP-SHR-02, CP-SHR-03, CP-SHR-04 | 0 | 3 | 4 |
| [`UC-SHR-02`](sharing/use-cases/uc-shr-02-open-shared-link.md) | RF-WEB-SHR-03, RF-WEB-SHR-04, RF-WEB-SHR-05, RF-APK-SHR-03, RF-APK-SHR-04, RF-APK-SHR-05 | CP-SHR-05, CP-SHR-06, CP-SHR-07, CP-SHR-08, CP-SHR-09 | 4 | 2 | 0 |
| [`UC-SHR-03`](sharing/use-cases/uc-shr-03-open-in-app-or-web.md) | RF-WEB-SHR-06, RF-WEB-SHR-07, RF-APK-SHR-06, RF-APK-SHR-07, RF-APK-SHR-08 | CP-SHR-10, CP-SHR-11, CP-SHR-12, CP-SHR-13, CP-SHR-14 | 0 | 0 | 1 |

## Notificaciones

La matriz del módulo está en [Pruebas](notifications/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-NOT-01`](notifications/use-cases/uc-not-01-manage-preferences.md) | RF-WEB-NOT-01, RF-WEB-NOT-02, RF-APK-NOT-01, RF-APK-NOT-02 | CP-NOT-01, CP-NOT-28, CP-NOT-02, CP-NOT-03, CP-NOT-04, CP-NOT-05 | 4 | 4 | 5 |
| [`UC-NOT-02`](notifications/use-cases/uc-not-02-unsubscribe.md) | RF-WEB-NOT-03 | CP-NOT-06, CP-NOT-07, CP-NOT-08 | 3 | 1 | n/a |
| [`UC-NOT-03`](notifications/use-cases/uc-not-03-allow-push.md) | RF-APK-NOT-03 | CP-NOT-09, CP-NOT-10, CP-NOT-11, CP-NOT-12, CP-NOT-29, CP-NOT-30 | 0 | n/a | 9 |
| [`UC-NOT-04`](notifications/use-cases/uc-not-04-register-device.md) | RF-APK-NOT-04 | CP-NOT-13, CP-NOT-14, CP-NOT-15, CP-NOT-16, CP-NOT-17, CP-NOT-31 | 4 | n/a | 4 |
| [`UC-NOT-05`](notifications/use-cases/uc-not-05-receive-push.md) | RF-APK-NOT-05, RF-APK-NOT-06 | CP-NOT-18, CP-NOT-19, CP-NOT-20, CP-NOT-21, CP-NOT-22, CP-NOT-23, CP-NOT-32, CP-NOT-33 | 15 | n/a | 5 |
| [`UC-NOT-06`](notifications/use-cases/uc-not-06-receive-email.md) | RF-WEB-NOT-04, RF-WEB-NOT-05, RF-WEB-NOT-06, RF-WEB-NOT-07, RF-WEB-NOT-08, RF-WEB-NOT-09, RF-APK-NOT-07, RF-APK-NOT-08, RF-APK-NOT-09, RF-APK-NOT-10, RF-APK-NOT-11, RF-APK-NOT-12 | CP-NOT-24, CP-NOT-25, CP-NOT-26, CP-NOT-27 | 6 | 0 | 0 |
| [`UC-NOT-07`](notifications/use-cases/uc-not-07-receive-suggestions.md) | RF-APK-NOT-13, RF-APK-NOT-14 | CP-NOT-34, CP-NOT-35, CP-NOT-36, CP-NOT-37, CP-NOT-38, CP-NOT-39, CP-NOT-40, CP-NOT-41, CP-NOT-42, CP-NOT-43 | 26 | n/a | 5 |

## Actividad

La matriz del módulo está en [Pruebas](activity/testing.md). La lectura de las señales para elegir sugerencias es parte de [`UC-NOT-07`](notifications/use-cases/uc-not-07-receive-suggestions.md), en Notificaciones.

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-ACT-01`](activity/use-cases/uc-act-01-record-detail-view.md) | RF-APK-ACT-01, RF-APK-ACT-02 | CP-ACT-01, CP-ACT-02, CP-ACT-03, CP-ACT-04, CP-ACT-05, CP-ACT-06 | 4 | n/a | 4 |
| [`UC-ACT-02`](activity/use-cases/uc-act-02-record-app-open.md) | RF-APK-ACT-03, RF-APK-ACT-04 | CP-ACT-07, CP-ACT-08, CP-ACT-09, CP-ACT-10, CP-ACT-11 | 4 | n/a | 4 |
| [`UC-ACT-03`](activity/use-cases/uc-act-03-purge-expired-signals.md) | — | CP-ACT-12, CP-ACT-13, CP-ACT-14, CP-ACT-15 | 3 | n/a | n/a |

## Puntos y sellos

La matriz del módulo está en [Pruebas](gamification/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-GAM-01`](gamification/use-cases/uc-gam-01-earn-and-lose-points.md) | RF-WEB-GAM-01, RF-WEB-GAM-02, RF-WEB-GAM-03, RF-APK-GAM-01, RF-APK-GAM-02, RF-APK-GAM-03 | CP-GAM-01, CP-GAM-02, CP-GAM-03, CP-GAM-04, CP-GAM-05, CP-GAM-06, CP-GAM-07, CP-GAM-08 | 8 | 1 | 0 |
| [`UC-GAM-02`](gamification/use-cases/uc-gam-02-view-my-points.md) | RF-WEB-GAM-04, RF-APK-GAM-04 | CP-GAM-09, CP-GAM-10, CP-GAM-11, CP-GAM-12, CP-GAM-13 | 3 | 6 | 6 |
| [`UC-GAM-03`](gamification/use-cases/uc-gam-03-celebrate-tier.md) | RF-WEB-GAM-05, RF-WEB-GAM-06, RF-APK-GAM-05, RF-APK-GAM-06, RF-APK-GAM-09 | CP-GAM-14, CP-GAM-15, CP-GAM-16, CP-GAM-17, CP-GAM-18, CP-GAM-19 | 6 | 4 | 5 |
| [`UC-GAM-04`](gamification/use-cases/uc-gam-04-seal-next-to-name.md) | RF-WEB-GAM-07, RF-WEB-GAM-08, RF-APK-GAM-07, RF-APK-GAM-08 | CP-GAM-20, CP-GAM-21, CP-GAM-22, CP-GAM-23, CP-GAM-24 | 7 | 4 | 6 |

## Perfiles y comparaciones IA

La matriz del módulo está en [Pruebas](ai/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-AI-01`](ai/use-cases/uc-ai-01-view-ai-profile.md) | RF-WEB-AI-01, RF-WEB-AI-02, RF-WEB-AI-03, RF-WEB-AI-04, RF-APK-AI-01, RF-APK-AI-02, RF-APK-AI-03, RF-APK-AI-04 | CP-AI-01, CP-AI-20, CP-AI-02, CP-AI-03, CP-AI-04, CP-AI-05 | 8 | 3 | 2 |
| [`UC-AI-02`](ai/use-cases/uc-ai-02-compare-wines.md) | RF-WEB-AI-05, RF-WEB-AI-06, RF-APK-AI-05, RF-APK-AI-06 | CP-AI-06, CP-AI-07, CP-AI-08, CP-AI-09 | 5 | 2 | 4 |
| [`UC-AI-03`](ai/use-cases/uc-ai-03-edit-ai-profile.md) | RF-WEB-AI-07, RF-WEB-AI-08, RF-APK-AI-07, RF-APK-AI-08, RF-APK-AI-09, RF-APK-AI-10 | CP-AI-10, CP-AI-11, CP-AI-12, CP-AI-13, CP-AI-14 | 3 | 0 | 2 |
| [`UC-AI-04`](ai/use-cases/uc-ai-04-control-ai-cost.md) | — | CP-AI-15, CP-AI-16, CP-AI-17, CP-AI-18, CP-AI-19 | 4 | n/a | n/a |

## Marketing en redes

La matriz del módulo está en [Pruebas](marketing/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-MKT-01`](marketing/use-cases/uc-mkt-01-plan-week.md) | RF-WEB-MKT-01, RF-WEB-MKT-02, RF-WEB-MKT-03, RF-WEB-MKT-04, RF-WEB-MKT-16, RF-WEB-MKT-17, RF-WEB-MKT-32 | CP-MKT-01, CP-MKT-02, CP-MKT-03, CP-MKT-04, CP-MKT-05, CP-MKT-06, CP-MKT-07, CP-MKT-32, CP-MKT-33, CP-MKT-67, CP-MKT-68 | 14 | 5 | n/a |
| [`UC-MKT-02`](marketing/use-cases/uc-mkt-02-approve-post.md) | RF-WEB-MKT-05, RF-WEB-MKT-06, RF-WEB-MKT-07, RF-WEB-MKT-16 | CP-MKT-08, CP-MKT-09, CP-MKT-10, CP-MKT-11, CP-MKT-12, CP-MKT-13, CP-MKT-34, CP-MKT-35, CP-MKT-36 | 9 | 11 | n/a |
| [`UC-MKT-03`](marketing/use-cases/uc-mkt-03-wine-day-calendar.md) | RF-WEB-MKT-08 | CP-MKT-14, CP-MKT-15 | 4 | 6 | n/a |
| [`UC-MKT-04`](marketing/use-cases/uc-mkt-04-render-post-media.md) | RF-WEB-MKT-09, RF-WEB-MKT-10, RF-WEB-MKT-11, RF-WEB-MKT-12, RF-WEB-MKT-13, RF-WEB-MKT-14, RF-WEB-MKT-18 | CP-MKT-16, CP-MKT-17, CP-MKT-18, CP-MKT-19, CP-MKT-20, CP-MKT-21, CP-MKT-22, CP-MKT-23, CP-MKT-24, CP-MKT-25, CP-MKT-26, CP-MKT-27, CP-MKT-28, CP-MKT-37, CP-MKT-38 | 18 | 5 | n/a |
| [`UC-MKT-05`](marketing/use-cases/uc-mkt-05-new-illustration.md) | RF-WEB-MKT-15 | CP-MKT-29, CP-MKT-30, CP-MKT-31 | 4 | 5 | n/a |
| [`UC-MKT-06`](marketing/use-cases/uc-mkt-06-publish-post.md) | RF-WEB-MKT-19, RF-WEB-MKT-20, RF-WEB-MKT-21, RF-WEB-MKT-22, RF-WEB-MKT-23, RF-WEB-MKT-31, RF-WEB-MKT-33, RF-APK-MKT-01 | CP-MKT-39, CP-MKT-40, CP-MKT-41, CP-MKT-42, CP-MKT-43, CP-MKT-44, CP-MKT-45, CP-MKT-46, CP-MKT-47, CP-MKT-69 | 23 | 5 | 5 |
| [`UC-MKT-07`](marketing/use-cases/uc-mkt-07-retry-publication.md) | RF-WEB-MKT-24, RF-APK-MKT-01 | CP-MKT-48, CP-MKT-49, CP-MKT-50, CP-MKT-51 | 5 | 4 | 4 |
| [`UC-MKT-08`](marketing/use-cases/uc-mkt-08-collect-metrics-weight-pillars.md) | RF-WEB-MKT-25, RF-WEB-MKT-26, RF-APK-MKT-01, RF-APK-MKT-02 | CP-MKT-52, CP-MKT-53, CP-MKT-54, CP-MKT-55 | 9 | 4 | 3 |
| [`UC-MKT-09`](marketing/use-cases/uc-mkt-09-auto-approve-by-pillar.md) | RF-WEB-MKT-27, RF-WEB-MKT-28, RF-APK-MKT-02 | CP-MKT-56, CP-MKT-57, CP-MKT-58, CP-MKT-59, CP-MKT-60 | 10 | 5 | 4 |
| [`UC-MKT-10`](marketing/use-cases/uc-mkt-10-connect-network-account.md) | RF-WEB-MKT-29, RF-WEB-MKT-30, RF-WEB-MKT-23, RF-APK-MKT-03 | CP-MKT-61, CP-MKT-62, CP-MKT-63, CP-MKT-64, CP-MKT-65, CP-MKT-66 | 14 | 6 | 3 |
| [`UC-MKT-11`](marketing/use-cases/uc-mkt-11-reschedule-post.md) | RF-WEB-MKT-34, RF-APK-MKT-04 | CP-MKT-70, CP-MKT-71, CP-MKT-72, CP-MKT-73, CP-MKT-74 | 6 | 7 | 8 |
| [`UC-MKT-12`](marketing/use-cases/uc-mkt-12-publish-post-now.md) | RF-WEB-MKT-35, RF-APK-MKT-04 | CP-MKT-75, CP-MKT-76, CP-MKT-77, CP-MKT-78, CP-MKT-79 | 6 | 5 | 6 |

## Soporte e información pública

La matriz del módulo está en [Pruebas](support/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-SUP-01`](support/use-cases/uc-sup-01-read-public-information.md) | RF-WEB-SUP-01, RF-APK-SUP-01 | CP-SUP-01, CP-SUP-02 | 0 | 2 | 1 |
| [`UC-SUP-02`](support/use-cases/uc-sup-02-contact-support.md) | RF-WEB-SUP-02, RF-WEB-SUP-03, RF-WEB-SUP-04, RF-APK-SUP-02, RF-APK-SUP-03, RF-APK-SUP-04 | CP-SUP-03, CP-SUP-04, CP-SUP-05, CP-SUP-06, CP-SUP-07, CP-SUP-08 | 6 | 5 | 5 |
| [`UC-SUP-03`](support/use-cases/uc-sup-03-service-states.md) | RF-WEB-SUP-05, RF-APK-SUP-05 | CP-SUP-09, CP-SUP-10 | 0 | 1 | 1 |

## Partners

La matriz del módulo está en [Pruebas](partner/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-PAR-01`](partner/use-cases/uc-par-01-list-own-events.md) | RF-WEB-PAR-01, RF-APK-PAR-01 | CP-PAR-01, CP-PAR-02 | 0 | 4 | 4 |
| [`UC-PAR-02`](partner/use-cases/uc-par-02-create-event.md) | RF-WEB-PAR-02, RF-APK-PAR-02 | CP-PAR-03, CP-PAR-04, CP-PAR-05, CP-PAR-06 | 1 | 2 | 3 |
| [`UC-PAR-03`](partner/use-cases/uc-par-03-edit-event.md) | RF-WEB-PAR-03, RF-WEB-PAR-04, RF-APK-PAR-03, RF-APK-PAR-04 | CP-PAR-07, CP-PAR-21, CP-PAR-23, CP-PAR-08, CP-PAR-09, CP-PAR-10, CP-PAR-22 | 4 | 4 | 2 |
| [`UC-PAR-04`](partner/use-cases/uc-par-04-cancel-event.md) | RF-WEB-PAR-05, RF-APK-PAR-05 | CP-PAR-11, CP-PAR-12, CP-PAR-13, CP-PAR-14 | 2 | 2 | 3 |
| [`UC-PAR-05`](partner/use-cases/uc-par-05-review-registrations.md) | RF-WEB-PAR-06, RF-WEB-PAR-07, RF-APK-PAR-06, RF-APK-PAR-07 | CP-PAR-15, CP-PAR-16, CP-PAR-17, CP-PAR-18 | 2 | 0 | 2 |
| [`UC-PAR-06`](partner/use-cases/uc-par-06-organizer-notices.md) | — | CP-PAR-19, CP-PAR-20 | 3 | n/a | n/a |

## Administración y moderación

La matriz del módulo está en [Pruebas](admin/testing.md).

| Caso de uso | Requisitos | Casos de prueba | Backend | Web | App |
|---|---|---|---|---|---|
| [`UC-ADM-01`](admin/use-cases/uc-adm-01-dashboard.md) | RF-WEB-ADM-01, RF-WEB-ADM-02, RF-APK-ADM-01, RF-APK-ADM-02 | CP-ADM-01, CP-ADM-02, CP-ADM-03 | 1 | 0 | 2 |
| [`UC-ADM-02`](admin/use-cases/uc-adm-02-manage-wines.md) | RF-WEB-ADM-03, RF-WEB-ADM-04, RF-WEB-ADM-05, RF-WEB-ADM-06, RF-WEB-ADM-07, RF-WEB-ADM-08, RF-APK-ADM-03, RF-APK-ADM-04, RF-APK-ADM-05, RF-APK-ADM-06, RF-APK-ADM-07, RF-APK-ADM-08 | CP-ADM-04, CP-ADM-05, CP-ADM-06, CP-ADM-07 | 5 | 5 | 4 |
| [`UC-ADM-03`](admin/use-cases/uc-adm-03-manage-wineries.md) | RF-WEB-ADM-09, RF-APK-ADM-09 | CP-ADM-08, CP-ADM-09, CP-ADM-10 | 3 | 2 | 2 |
| [`UC-ADM-04`](admin/use-cases/uc-adm-04-manage-events.md) | RF-WEB-ADM-10, RF-WEB-ADM-11, RF-WEB-ADM-12, RF-APK-ADM-10, RF-APK-ADM-11, RF-APK-ADM-12 | CP-ADM-11, CP-ADM-12, CP-ADM-13, CP-ADM-14, CP-ADM-56 | 3 | 3 | 2 |
| [`UC-ADM-05`](admin/use-cases/uc-adm-05-manage-routes.md) | RF-WEB-ADM-13, RF-WEB-ADM-14, RF-WEB-ADM-15, RF-APK-ADM-13, RF-APK-ADM-14, RF-APK-ADM-15 | CP-ADM-15, CP-ADM-16, CP-ADM-17, CP-ADM-18 | 2 | 1 | 1 |
| [`UC-ADM-06`](admin/use-cases/uc-adm-06-review-wine-submissions.md) | RF-WEB-ADM-16, RF-WEB-ADM-17, RF-WEB-ADM-18, RF-WEB-ADM-19, RF-WEB-ADM-20, RF-APK-ADM-16, RF-APK-ADM-17, RF-APK-ADM-18, RF-APK-ADM-19, RF-APK-ADM-20 | CP-ADM-19, CP-ADM-20, CP-ADM-21, CP-ADM-22, CP-ADM-23, CP-ADM-24 | 1 | 2 | 2 |
| [`UC-ADM-07`](admin/use-cases/uc-adm-07-moderate-reports.md) | RF-WEB-ADM-21, RF-WEB-ADM-22, RF-APK-ADM-21, RF-APK-ADM-22 | CP-ADM-25, CP-ADM-26, CP-ADM-27, CP-ADM-28, CP-ADM-29 | 4 | 3 | 1 |
| [`UC-ADM-08`](admin/use-cases/uc-adm-08-review-publications.md) | RF-WEB-ADM-23, RF-APK-ADM-23 | CP-ADM-30, CP-ADM-31, CP-ADM-32, CP-ADM-33 | 3 | 2 | 1 |
| [`UC-ADM-09`](admin/use-cases/uc-adm-09-manage-reviews.md) | RF-WEB-ADM-24, RF-APK-ADM-24 | CP-ADM-34, CP-ADM-35, CP-ADM-36 | 1 | 1 | 1 |
| [`UC-ADM-10`](admin/use-cases/uc-adm-10-manage-users.md) | RF-WEB-ADM-25, RF-WEB-ADM-26, RF-WEB-ADM-27, RF-WEB-ADM-28, RF-WEB-ADM-29, RF-APK-ADM-25, RF-APK-ADM-26, RF-APK-ADM-27, RF-APK-ADM-28, RF-APK-ADM-29 | CP-ADM-37, CP-ADM-38, CP-ADM-39, CP-ADM-40 | 5 | 2 | 2 |
| [`UC-ADM-11`](admin/use-cases/uc-adm-11-suspend-user.md) | RF-WEB-ADM-30, RF-APK-ADM-30 | CP-ADM-41, CP-ADM-42, CP-ADM-43, CP-ADM-44 | 2 | 3 | 2 |
| [`UC-ADM-12`](admin/use-cases/uc-adm-12-send-announcements.md) | RF-WEB-ADM-31, RF-APK-ADM-31 | CP-ADM-45, CP-ADM-46, CP-ADM-47, CP-ADM-48 | 10 | 5 | 5 |
| [`UC-ADM-13`](admin/use-cases/uc-adm-13-control-push.md) | RF-WEB-ADM-32, RF-APK-ADM-32 | CP-ADM-49, CP-ADM-50, CP-ADM-51 | 5 | 5 | 3 |
| [`UC-ADM-14`](admin/use-cases/uc-adm-14-moderation-digest.md) | — | CP-ADM-52, CP-ADM-53, CP-ADM-54, CP-ADM-55 | 4 | n/a | n/a |
| [`UC-ADM-15`](admin/use-cases/uc-adm-15-minimum-app-version.md) | RF-WEB-ADM-33, RF-APK-ADM-33 | CP-ADM-57, CP-ADM-58, CP-ADM-59, CP-ADM-60, CP-ADM-61, CP-ADM-62, CP-ADM-63 | 7 | 5 | 6 |

## Requisitos transversales

Algunos requisitos no pertenecen a un módulo: estados de carga y error, confirmaciones,
permisos ante acceso directo, imágenes, datos de referencia y mapas integrados. Siguen en los
requisitos de cada plataforma:

- [Requisitos web transversales](../frontend-web/use-cases/functional-requirements.md): `RF-WEB-MEDIA-001`, `RF-WEB-MEDIA-002`, `RF-WEB-MEDIA-003`, `RF-WEB-MEDIA-004`, `RF-WEB-REF-001`, `RF-WEB-REF-002`, `RF-WEB-REF-003`, `RF-WEB-REF-004`, `RF-WEB-UX-002`, `RF-WEB-UX-003`, `RF-WEB-UX-004`, `RF-WEB-UX-005`, `RF-WEB-WEBX-001`.
- [Requisitos APK transversales](../frontend-mobile/use-cases/functional-requirements.md): `RF-APK-MEDIA-001`, `RF-APK-MEDIA-002`, `RF-APK-MEDIA-003`, `RF-APK-MEDIA-004`, `RF-APK-REF-001`, `RF-APK-REF-002`, `RF-APK-REF-003`, `RF-APK-REF-004`, `RF-APK-UX-002`, `RF-APK-UX-003`, `RF-APK-UX-004`, `RF-APK-UX-005`.
