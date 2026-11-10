import { AppState } from "react-native";

export interface ApplicationLifecycleCallbacks {
  onFocus: () => void;
  onFocusLost: () => void;
}

export const applicationLifecycleGateway = {
  subscribe(callbacks: ApplicationLifecycleCallbacks): () => void {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const becameActive = previousState !== "active" && nextState === "active";
      previousState = nextState;

      if (becameActive) {
        callbacks.onFocus();
      } else if (nextState !== "active") {
        callbacks.onFocusLost();
      }
    });

    return () => subscription.remove();
  },
};
