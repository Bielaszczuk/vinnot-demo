import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@components/ui/Button";
import { Icon } from "@components/ui/Icon";
import { GlassRating } from "@components/ui/rating/GlassRating";
import { ImageWithFallback } from "@components/ui/ImageWithFallback";
import { formatDecimal } from "@utils/format";
import { wineDefaultImage } from "@utils/wine";
import type { Wine } from "@domain/wine/wine.types";

type WineCompareSelectionCardProps = {
  variant: "A" | "B";
  wine: Wine | undefined;
  t: (key: string) => string;
  disabled?: boolean;
  onOpenSearch: () => void;
  onOpenWineDetails: (id: string) => void;
};

export function WineCompareSelectionCard({
  variant,
  wine,
  t,
  disabled = false,
  onOpenSearch,
  onOpenWineDetails,
}: WineCompareSelectionCardProps) {
  const isA = variant === "A";
  const topGradient = isA ? "from-wine-700 to-wine-500" : "from-gray-500 to-gray-300";
  const slotLabelClass = isA
    ? "text-2xs font-bold uppercase tracking-widest text-wine-700"
    : "text-2xs font-bold uppercase tracking-widest text-gray-500";
  const grapeClass = isA ? "text-xs font-medium text-wine-700" : "text-xs font-medium text-gray-500";
  const emptyIcon = isA ? "bg-wine-50 text-wine-700" : "bg-gray-50 text-gray-500";
  const selectText = isA ? t("compare.selectFirstWine") : t("compare.selectSecondWine");

  if (!wine) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${topGradient}`} />
        <div className="p-8 text-center">
          <div aria-hidden="true" className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${emptyIcon}`}>
            <Icon icon={Plus} size="lg" />
          </div>
          <p className="mb-4 text-sm text-gray-500">{selectText}</p>
          <Button size="sm" onClick={onOpenSearch} disabled={disabled}>
            {t("compare.selectWine")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${topGradient}`} />
      <div className="p-5">
        <span className={`mb-3 inline-block ${slotLabelClass}`}>{isA ? t("compare.wineA") : t("compare.wineB")}</span>
        <div className="flex gap-4">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-cream ring-1 ring-border"
            onClick={() => onOpenWineDetails(wine.id)}
          >
            <ImageWithFallback
              src={wine.imageUrl?.trim() || wineDefaultImage(wine.type)}
              fallbackSrc={wineDefaultImage(wine.type)}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate">
              <button
                type="button"
                className="max-w-full truncate rounded-sm text-left font-semibold text-ink transition-colors hover:text-wine-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
                onClick={() => onOpenWineDetails(wine.id)}
              >
                {wine.name}
              </button>
            </h3>
            {wine.grapeVarieties?.length > 0 && <p className={`truncate ${grapeClass}`}>{wine.grapeVarieties.join(" · ")}</p>}
            <p className="text-sm text-gray-500">{wine.winery}</p>
            <p className="text-xs text-gray-500">{wine.region}</p>
            {wine.rating ? (
              <div className="mt-1 flex items-center gap-1">
                <GlassRating value={wine.rating} wineType={wine.type} size={16} />
                <span aria-hidden="true" className="text-xs font-medium text-gray-600">{formatDecimal(wine.rating, 1)}</span>
              </div>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSearch} className="mt-4 w-full border-dashed" leftIcon={<Icon icon={RefreshCw} />}>
          {t("compare.changeWine")}
        </Button>
      </div>
    </div>
  );
}
