import {
  breatheScale,
  dewOpacity,
  glitterStep,
  haloFrame,
  keyframes,
  layerPhase,
  nextReplayDelay,
  pulseOpacity,
  riseFrame,
  ripenOpacity,
  swayDegrees,
  sweepLine,
  sweepPosition,
  twinkleFrame,
} from "./sealMotion";

describe("seal motion", () => {
  it("loops forever in the profile and plays once per burst in lists", () => {
    expect(layerPhase(5.5, 2, 0, true)).toEqual({ active: true, p: 0.75 });
    expect(layerPhase(1, 2, 0, false)).toEqual({ active: true, p: 0.5 });
    expect(layerPhase(2.5, 2, 0, false)).toEqual({ active: false, p: 1 });
    expect(layerPhase(0.5, 2, 1, true)).toEqual({ active: false, p: 0 });
  });

  it("follows the prototype keyframes", () => {
    expect(swayDegrees(0.25)).toBeCloseTo(-3.2);
    expect(swayDegrees(0.75)).toBeCloseTo(3.2);
    expect(breatheScale(0.5)).toBeCloseTo(1.035);
    expect(pulseOpacity(0)).toBeCloseTo(0.3);
    expect(pulseOpacity(0.5)).toBeCloseTo(1);
    expect(ripenOpacity(0.5)).toBeCloseTo(0.85);
    expect(dewOpacity(0.45)).toBe(1);
    expect(dewOpacity(0.2)).toBe(0);
    expect(haloFrame(0.5)).toEqual({ opacity: expect.closeTo(0.9), scale: expect.closeTo(1.04) });
    expect(twinkleFrame(0.18)).toEqual({ opacity: 1, scale: 1, rotate: 45 });
    expect(riseFrame(0.15).opacity).toBe(1);
    expect(riseFrame(1).travel).toBe(1);
    expect(glitterStep(0.5)).toEqual({ opacity: 1, shift: 1 });
    expect(keyframes(2, [0, 1], [3, 4])).toBe(4);
  });

  it("sweeps the highlight across the seal in the first 45% and then rests off the edge", () => {
    expect(sweepPosition(0, "sweep")).toBe(1);
    expect(sweepPosition(0.45, "sweep")).toBe(0);
    expect(sweepPosition(0.8, "sweepSnap")).toBe(0);
    expect(sweepPosition(0.25, "loop")).toBe(0.75);
    expect(sweepPosition(1, "loopEase")).toBe(0);
  });

  it("places the band of a 300% background at the seal edges", () => {
    const start = sweepLine(1, 3, 90, 0, 0, 100);
    const end = sweepLine(0, 3, 90, 0, 0, 100);
    expect((start.x0 + start.x1) / 2).toBeCloseTo(-50);
    expect((end.x0 + end.x1) / 2).toBeCloseTo(150);
    expect(start.x1 - start.x0).toBeCloseTo(300);
  });

  it("replays list seals every 8 to 16 seconds", () => {
    expect(nextReplayDelay(0)).toBe(8000);
    expect(nextReplayDelay(1)).toBe(16000);
    expect(nextReplayDelay(0.5)).toBe(12000);
  });
});
