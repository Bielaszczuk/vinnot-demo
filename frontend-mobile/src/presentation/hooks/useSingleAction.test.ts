import { act, renderHook } from "@testing-library/react-native";
import { useSingleAction } from "./useSingleAction";

it("keeps the intent pending through authentication and executes once even with repeated taps", async () => {
  const { result } = renderHook(useSingleAction);
  let finish!: () => void;
  const operation = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const success = jest.fn();
  const failure = jest.fn();
  let work!: Promise<void>;
  act(() => {
    work = result.current.run(operation, success, failure);
  });
  expect(result.current.pending).toBe(true);
  await act(async () => result.current.run(operation, success, failure));
  expect(operation).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
    await work;
  });
  expect(success).toHaveBeenCalledTimes(1);
  expect(failure).not.toHaveBeenCalled();
  expect(result.current.pending).toBe(false);
});
it("reports cancellation or failure without success and permits an explicit retry", async () => {
  const { result } = renderHook(useSingleAction);
  const success = jest.fn();
  const failure = jest.fn();
  await act(async () =>
    result.current.run(
      async () => {
        throw new Error("cancelled");
      },
      success,
      failure,
    ),
  );
  expect(failure).toHaveBeenCalledTimes(1);
  expect(success).not.toHaveBeenCalled();
  await act(async () => result.current.run(async () => {}, success, failure));
  expect(success).toHaveBeenCalledTimes(1);
});
