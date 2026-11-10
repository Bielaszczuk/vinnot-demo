import { sensoryBarWidth } from "./sensoryBar";

it.each([[0, 3], [1, 3], [3, 3], [5, 5], [70, 70], [100, 100], [150, 100], [-1, 3], [NaN, 0], [Infinity, 0]])(
  "renders score %s with width %s without changing the stored score", (score, width) => {
    expect(sensoryBarWidth(score)).toBe(width);
  },
);
