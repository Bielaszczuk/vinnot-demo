import { applicationLifecycleGateway } from "@/infrastructure/device/applicationLifecycle.gateway";

export interface ApplicationLifecycleHandlers {
  onFocus: () => void;
  onFocusLost: () => void;
}

export const applicationLifecycleService = {
  subscribe(handlers: ApplicationLifecycleHandlers): () => void {
    return applicationLifecycleGateway.subscribe(handlers);
  },
};
