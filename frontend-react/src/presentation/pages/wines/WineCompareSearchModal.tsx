import { Modal } from "@components/ui/Modal";
import { Search } from "lucide-react";
import { Icon } from "@components/ui/Icon";
import { GlassRating } from "@components/ui/rating/GlassRating";
import { ImageWithFallback } from "@components/ui/ImageWithFallback";
import { PageLoader } from "@components/ui/PageLoader";
import { Spinner } from "@components/ui/Spinner";
import { fieldClassName } from "@components/ui/fieldStyles";
import { formatDecimal } from "@utils/format";
import { wineDefaultImage } from "@utils/wine";
import type { WineSummary } from "@domain/wine/wine.types";
import type { RefObject, UIEvent } from "react";
import type { TFunction } from "i18next";

type WineCompareSearchModalProps = {
  open: boolean;
  t: TFunction;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchListRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchScroll: (event: UIEvent<HTMLDivElement>) => void;
  searchingFirstPage: boolean;
  searching: boolean;
  searchPage: number;
  searchResults: WineSummary[];
  onSelectWine: (wine: WineSummary) => void;
  onClose: () => void;
};

export function WineCompareSearchModal({
  open,
  t,
  searchInputRef,
  searchListRef,
  searchQuery,
  onSearchChange,
  onSearchScroll,
  searchingFirstPage,
  searching,
  searchPage,
  searchResults,
  onSelectWine,
  onClose,
}: WineCompareSearchModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      ariaLabel={t("compare.searchWine")}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/60 backdrop-blur-sm"
      panelClassName="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      <div className="border-b border-gray-100 p-4">
        <div className="relative">
          <Icon icon={Search} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("compare.searchPlaceholder")}
            aria-label={t("compare.searchWine")}
            className={fieldClassName({ className: "py-3 pl-10 pr-4" })}
          />
        </div>
      </div>

      <div
        ref={searchListRef}
        className="max-h-[70vh] overflow-y-auto p-2"
        onScroll={onSearchScroll}
      >
        {(searchingFirstPage || (searching && searchPage === 0)) && (
          <PageLoader compact />
        )}

        {!searching && searchQuery.length < 2 && (
          <p className="py-8 text-center text-sm text-gray-500">{t("compare.typeToSearch")}</p>
        )}

        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">{t("compare.noResults")}</p>
        )}

        {searchResults.map((wine) => (
          <button
            key={wine.id}
            type="button"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-wine-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
            onClick={() => onSelectWine(wine)}
          >
            <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-cream ring-1 ring-border">
              <ImageWithFallback
                src={wine.imageUrl?.trim() || wineDefaultImage(wine.type)}
                fallbackSrc={wineDefaultImage(wine.type)}
                alt=""
                className="h-10 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{wine.name}</p>
              <p className="truncate text-xs text-gray-500">
                {wine.winery}
                {wine.vintage ? ` · ${wine.vintage}` : ""}
              </p>
            </div>
            {wine.rating != null && (
              <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-bold text-ink">
                <GlassRating value={wine.rating} wineType={wine.type} size={16} />
                <span aria-hidden="true">{formatDecimal(wine.rating, 1)}</span>
              </span>
            )}
          </button>
        ))}

        {searching && searchPage > 0 && (
          <div className="flex justify-center py-3">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </Modal>
  );
}
