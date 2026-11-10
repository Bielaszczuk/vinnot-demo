export function resolveMobileEnvironment(options?: {
  environment?: string;
  profile?: string;
  channel?: string;
  apiUrl?: string;
  publishing?: boolean;
}): {
  environment: "development" | "staging" | "production";
  apiBaseUrl: string;
};

export function resolveMobileProjectId(environment: string, explicitId?: string): string;
