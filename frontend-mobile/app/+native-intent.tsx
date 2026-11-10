import { paymentReturnDestination } from '@/presentation/navigation/paymentReturn';
import { safeNativeIntent } from '@/domain/navigation/nativeIntent';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return paymentReturnDestination(path) ?? safeNativeIntent(path);
}
