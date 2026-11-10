import { randomUUID } from "expo-crypto";
export function createSupportRequestId(): string {
  return randomUUID();
}
