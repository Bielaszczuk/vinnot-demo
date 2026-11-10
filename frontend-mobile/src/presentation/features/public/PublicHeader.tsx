import { AppHeader } from "@/presentation/components/layout";

/** Public deep links also need a destination when there is no navigation history. */
export function PublicHeader({ title }: { title: string }) {
  return <AppHeader title={title} showBack backFallback="/" />;
}
