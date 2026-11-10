import { act, type RenderResult } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { POUR_GLASS_HEIGHT, pourLayout, type PourSize } from "@/presentation/features/wine/rating/pourGeometry";
import { ratingArt } from "@/presentation/features/wine/rating/ratingArt";
import type { WineType } from "@/domain/wine/wine.types";

/**
 * Rates through the pour control the way a person does: a tap over the glasses at that score.
 * `size` and `wineType` must match the control under test: `lg` in the review form, `md` in the
 * cellar sheet. Tests never fire a layout, so the control keeps its compact width.
 */
export async function ratePour(
  view: Pick<RenderResult, "getByRole">,
  value: number,
  size: PourSize = "lg",
  wineType?: WineType | null,
) {
  view.getByRole("adjustable", { name: "reviews.form.pourLabel" });
  const art = ratingArt(wineType);
  const layout = pourLayout(POUR_GLASS_HEIGHT[size], art.glass, art.bottle);
  // A hair past the exact spot, so float noise cannot round a .x5 score down.
  const x = layout.side + (value / 5) * layout.inner + 1e-6;
  const y = layout.glassHeight;
  await act(async () => {
    fireGestureHandler(getByGestureTestId("rating-pour-tap"), [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      { state: State.END, x, y },
    ]);
    // Gesture callbacks hand the value back to React on the next tick.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
