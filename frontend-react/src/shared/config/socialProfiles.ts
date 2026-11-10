export type SocialNetwork = "instagram" | "facebook" | "threads" | "tiktok";

export interface SocialProfile {
  network: SocialNetwork;
  /** Brand name shown to people; never translated. */
  name: string;
  url: string;
}

/** Vinnot's official social profiles, in the order the footer lists them. */
export const SOCIAL_PROFILES: readonly SocialProfile[] = [
  { network: "instagram", name: "Instagram", url: "https://www.instagram.com/vinnotapp/" },
  { network: "facebook", name: "Facebook", url: "https://www.facebook.com/profile.php?id=61595940584834" },
  { network: "threads", name: "Threads", url: "https://www.threads.com/@vinnotapp" },
  { network: "tiktok", name: "TikTok", url: "https://www.tiktok.com/@vinnotapp" },
];
