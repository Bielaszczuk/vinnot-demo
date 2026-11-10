import { useEffect, useReducer } from "react";

type ProgressiveStepOptions = {
  stepCount: number;
  intervalMs: number;
};

function advanceStep(currentStep: number, lastStep: number): number {
  return Math.min(currentStep + 1, lastStep);
}

export function useProgressiveStep({
  stepCount,
  intervalMs,
}: ProgressiveStepOptions): number {
  const lastStep = Math.max(stepCount - 1, 0);
  const [activeStep, advance] = useReducer(
    (currentStep: number) => advanceStep(currentStep, lastStep),
    0,
  );

  useEffect(() => {
    if (activeStep >= lastStep) return;

    const timeout = setTimeout(advance, intervalMs);
    return () => clearTimeout(timeout);
  }, [activeStep, intervalMs, lastStep]);

  return activeStep;
}
