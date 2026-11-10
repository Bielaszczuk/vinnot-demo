import { illustrations } from "@shared/illustrations";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  stateCopy,
  type IllustratedStateKind,
} from "@/presentation/feedback/illustratedState";
import { ImageWithFallback } from "./ImageWithFallback";

const images: Partial<Record<IllustratedStateKind, string>> = {
  forbidden: illustrations.forbidden,
  notFound: illustrations.notFound,
  server: illustrations.server,
  unavailable: illustrations.unavailable,
  rateLimit: illustrations.rateLimit,
  offline: illustrations.offline,
  timeout: illustrations.timeout,
  emptyCellar: illustrations.emptyCellar,
};
export function IllustratedState({
  kind,
  children,
  compact = false,
}: {
  kind: IllustratedStateKind;
  children?: ReactNode;
  compact?: boolean;
}) {
  const { i18n } = useTranslation();
  const [title, description] =
    stateCopy[i18n.language?.startsWith("en") ? "en" : "es"][kind];
  const file = images[kind];
  const Heading = compact ? "h2" : "h1";
  return (
    <section
      className={`mx-auto flex w-full max-w-2xl flex-col items-center px-5 text-center ${compact ? "py-6" : "py-10 sm:py-14"}`}
      aria-label={title}
    >
      {file && (
        <ImageWithFallback
          src={file}
          alt=""
          width={768}
          height={
            kind === "rateLimit" || kind === "timeout" || kind === "emptyCellar"
              ? 768
              : 576
          }
          className={`mb-6 w-full rounded-2xl object-contain ${compact ? "max-h-40" : "max-h-64 sm:max-h-72"}`}
          fallbackElement={
            <div className="mb-6 h-2 w-12 rounded-full bg-wine-100" />
          }
        />
      )}
      <Heading className="text-2xl font-semibold tracking-tight text-gray-900">
        {title}
      </Heading>
      <p className="mt-3 max-w-lg text-base leading-relaxed text-gray-600">
        {description}
      </p>
      {children && (
        <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          {children}
        </div>
      )}
    </section>
  );
}
