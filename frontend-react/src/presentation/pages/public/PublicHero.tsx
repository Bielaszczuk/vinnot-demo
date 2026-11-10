import { illustrations } from "@shared/illustrations";
import type { ReactNode } from "react";
import { ImageWithFallback } from "@components/ui/ImageWithFallback";

const publicArtwork: Readonly<Record<string, string>> = {
  legal: illustrations.legal,
  privacy: illustrations.privacy,
  winery: illustrations.winery,
};

/** Shared editorial rhythm for public information, using Vinnot's existing artwork. */
export function PublicHero({ eyebrow, title, summary, image = "legal", children }: {
  eyebrow: string; title: string; summary: string; image?: string; children?: ReactNode;
}) {
  return <header className="relative isolate overflow-hidden rounded-[2rem] border border-border bg-surface-cream">
    <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-wine-700" />
    <div className="grid items-center gap-8 p-7 sm:p-12 md:grid-cols-[1.1fr_.9fr]">
      <div>
        <p className="text-2xs font-semibold uppercase tracking-[.24em] text-wine-700">Vinnot · {eyebrow}</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">{title}</h1>
        <div aria-hidden="true" className="my-6 flex items-center gap-2"><span className="h-px w-14 bg-wine-500" /><span className="h-px w-28 bg-border" /></div>
        <p className="max-w-xl text-base leading-8 text-gray-600 sm:text-lg">{summary}</p>
        {children}
      </div>
      <div className="relative p-4 sm:p-6">
        <ImageWithFallback src={publicArtwork[image] ?? illustrations.legal} alt="" width={768} height={576}
          className="aspect-[4/3] w-full rounded-2xl object-contain" fallbackElement={<div className="aspect-[4/3] bg-wine-50" />} />
      </div>
    </div>
  </header>;
}
