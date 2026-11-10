import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { SOCIAL_PROFILES, type SocialNetwork } from "@shared/config/socialProfiles";
import { socialPatches } from "@shared/socialPatches";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  TikTokIcon,
  type SocialIconProps,
} from "@/presentation/components/brand/SocialIcons";

const glyphs: Record<SocialNetwork, ComponentType<SocialIconProps>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  threads: ThreadsIcon,
  tiktok: TikTokIcon,
};

/** Each official logo sits unmodified on an illustrated cream patch, in the app's watercolor style. */
export function FooterSocialLinks() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("footer.social.title")} className="mt-6">
      <p className="mb-3 text-sm font-semibold text-white">{t("footer.social.title")}</p>
      <ul className="flex flex-wrap gap-3">
        {SOCIAL_PROFILES.map((profile, index) => {
          const Glyph = glyphs[profile.network];
          return (
            <li key={profile.network}>
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("footer.social.linkLabel", { network: profile.name })}
                className="relative flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-200"
              >
                <img
                  src={socialPatches[index % socialPatches.length]}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <span className="relative">
                  <Glyph size={20} color="#5B1A28" />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
