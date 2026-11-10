# Mobile UI/UX guidelines

> The complete visual guide for web and app (tokens, components, imagery, layout, copy) is
> the [design guide](../../shared/design/visual-system.md). This page keeps the mobile
> behaviour rules; when they differ, the design guide and the current code win.

## Principles

- Clarity before decoration.
- Visible response to every action.
- Consistent hierarchy and spacing.
- Comfortable touch controls.
- Recoverable states for network, permissions, or provider failures.
- Intent parity with web, adapted to mobile context.

## Layout

- Respect top and bottom safe areas.
- Scrollable content adds enough space so the tab bar never covers actions or the
  last card.
- Navigation selection stays within its visual bounds.
- Cards, forms, and lists use theme spacing/tokens.
- The keyboard must not hide the active field or primary action.
- Forms in `BottomSheetModal` use `fillParent` with `adjustResize` on Android and
  `interactive` on iOS. Gorhom skips interactive positioning with `adjustResize`
  on Android. The shared scroll view remeasures the focused field when the
  keyboard appears or layout changes; hiding the keyboard restores the sheet.

## Controls

- Minimum touch target: 44×44 points.
- Primary buttons keep full text; critical labels are not truncated.
- Blank space between options does not trigger another option.
- A replaceable selection exposes a clear remove/change action.
- Disabled states keep sufficient contrast and explain why when needed.

## Feedback

| State | Presentation |
|---|---|
| Short loading | Local indicator without blocking the whole screen |
| Long operation | Understandable stage progress and cancellation |
| Empty | Reason and valid next action |
| Recoverable error | Specific message and retry |
| Offline | Preserve context and allow retry |
| Success | Confirmation and predictable navigation |

## Animation

Animation has a semantic relationship to capture, analysis, comparison,
generation, or completion. Elements do not overlap, stages represent UI progress, not provider telemetry. The journey hook
coordinates minimum presentation duration. Respect reduced
motion preferences.

The AI profile and the comparison show, at each stage, a watercolor scene in the same style as the rest of the app's illustrations, inside a ring that fills as stages advance. Each scene is animated by parts and acts out what the stage does: the corkscrew uncorks the bottle, wine fills the glass, aromas rise, a sip lowers the level, the pen writes the tasting note, both glasses are poured side by side, a bunch of grapes drops into each pan and the balance swings until it settles, and a magnifier examines one wine and then the other. Each stage lasts 1.8 s in the profile and 2.5 s in the comparison, because the answers take about 10.4 and 11 s; this way the last stage starts before the answer arrives, lasts at least as long as the pen takes to write the note, and the minimum wait stays within those times. The gesture plays once, calmly, and the scene rests; only the last stage, the note being written, writes again after a pause while the answer arrives. With reduced motion the final pose and the full ring are shown directly, without animation. The layers live in `frontend-mobile/assets/images/loading/`.

The scenes follow each wine's type (`wineSceneLook`): red wine is served in a Bordeaux glass from a dark bottle; fortified wine uses the same glass with a lighter ruby; rosé has its own glass; white wine is served in a tulip glass, and orange and dessert wines in the same glass in amber; sparkling wine is served in a flute with rising bubbles. Bottles of wines that are not red are clear and show the wine's colour. The stream that fills the glass has the wine's colour. Sparkling wine is not opened with a corkscrew: the wire cage comes off, the cork pops and a little foam wells up. In the comparison each glass follows its own wine, the magnifier aims at each wine's glass, and red grapes drop into the balance for red, fortified and rosé wines, white grapes for the rest. While the wine's type is not known yet, the scene draws a red wine. The note being written is the same for every wine.

## Content and language

UI resources are maintained in i18n; their consumption is verified per component. The user's language selection overrides the device
and is persisted. Backend-generated content is requested in the active language;
bilingual profiles and comparisons are not translated in UI.

## Accessibility and QA

- VoiceOver/TalkBack for controls, informative images, and states.
- Contrast, large text, orientation, and focus.
- Compact and large devices on iOS and Android.
- Slow/offline network, denied permissions, and late responses.
- Visual captures for navigation, card, and form regressions.
