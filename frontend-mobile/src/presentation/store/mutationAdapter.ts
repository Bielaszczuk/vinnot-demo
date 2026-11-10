import type { MutationRequest } from "@/application/operations";
import { useExecuteMutationMutation } from "@/presentation/store/api";
import { useCallback, useRef } from "react";

type MutationCallbacks<TResult, TArg> = {
  onSuccess?: (data: TResult, variables: TArg) => void;
  onError?: (error: unknown, variables: TArg) => void;
};

type MutationState<TResult> = {
  data?: TResult;
  error?: unknown;
  isUninitialized: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
};

type TriggerResult<TResult> = {
  unwrap: () => Promise<TResult>;
  abort?: () => void;
};

type Trigger<TResult, TArg> = (arg: TArg) => TriggerResult<TResult>;

export function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getMutationErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

export function useMutationAdapter<TResult, TArg>(
  trigger: Trigger<TResult, TArg>,
  state: MutationState<TResult>,
) {
  const mutate = (arg: TArg, callbacks?: MutationCallbacks<TResult, TArg>) => {
    void trigger(arg)
      .unwrap()
      .then((data) => {
        callbacks?.onSuccess?.(data, arg);
      })
      .catch((error) => {
        callbacks?.onError?.(error, arg);
      });
  };

  const mutateAsync = async (arg: TArg): Promise<TResult> => trigger(arg).unwrap();

  return {
    ...state,
    isPending: state.isLoading,
    mutate,
    mutateAsync,
  };
}

export function useOperationMutation<TResult, TArg>(
  requestFactory: (arg: TArg) => MutationRequest,
) {
  const [trigger, state] = useExecuteMutationMutation();
  const activeRequest = useRef<TriggerResult<TResult> | null>(null);
  const typedTrigger = ((arg: TArg) => {
    const request = trigger(requestFactory(arg)) as unknown as TriggerResult<TResult>;
    activeRequest.current = request;
    return request;
  }) as Trigger<TResult, TArg>;
  const adapter = useMutationAdapter<TResult, TArg>(
    typedTrigger,
    state as MutationState<TResult>,
  );
  const cancel = useCallback(() => {
    activeRequest.current?.abort?.();
    activeRequest.current = null;
  }, []);
  return {
    ...adapter,
    cancel,
  };
}
