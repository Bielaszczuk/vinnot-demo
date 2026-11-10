import { useLocalSearchParams } from "expo-router";
import { PublicDocumentScreen } from "@/presentation/features/public/PublicDocumentScreen";
export default function Screen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <PublicDocumentScreen key={slug} slug={slug ?? ""} />;
}
