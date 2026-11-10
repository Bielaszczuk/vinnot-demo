import { reducedImageTransition, reducedModalAnimation, reducedStackAnimation } from "./reducedMotion";

describe("reducedStackAnimation", () => {
  it.each([
    ["slide_from_right", "fade"],
    ["slide_from_bottom", "fade"],
    ["slide_from_left", "fade"],
    ["default", "fade"],
    [undefined, "fade"],
    ["fade", "fade"],
    ["none", "none"],
  ] as const)("cross-dissolves %s under Reduce Motion, as iOS does", (animation, reduced) => {
    expect(reducedStackAnimation(animation, true)).toBe(reduced);
  });

  it.each(["slide_from_right", "slide_from_bottom", "fade", undefined] as const)(
    "keeps %s when Reduce Motion is off",
    (animation) => {
      expect(reducedStackAnimation(animation, false)).toBe(animation);
    },
  );
});

describe("reducedModalAnimation", () => {
  it("turns a sliding modal into a fade under Reduce Motion and keeps fades and none", () => {
    expect(reducedModalAnimation("slide", true)).toBe("fade");
    expect(reducedModalAnimation("fade", true)).toBe("fade");
    expect(reducedModalAnimation("none", true)).toBe("none");
  });

  it("keeps the modal animation when Reduce Motion is off", () => {
    expect(reducedModalAnimation("slide", false)).toBe("slide");
    expect(reducedModalAnimation("fade", false)).toBe("fade");
  });
});

describe("reducedImageTransition", () => {
  it("shows images at once under Reduce Motion", () => {
    expect(reducedImageTransition(180, true)).toBe(0);
    expect(reducedImageTransition({ duration: 300, effect: "cross-dissolve" }, true)).toBe(0);
  });

  it("keeps the image fade-in when Reduce Motion is off", () => {
    expect(reducedImageTransition(180, false)).toBe(180);
    expect(reducedImageTransition(undefined, false)).toBeUndefined();
  });
});
