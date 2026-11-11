/**
 * Follow / unfollow with an optimistic state: the button flips at once, the server call
 * runs behind it and a failure puts the previous state back with a message. The mutation
 * refreshes profiles, lists, the feed and suggestions when it succeeds.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFollowMutations } from "@/presentation/hooks/queries/social";
import { useToast } from "@/presentation/providers/ToastProvider";

export function useFollowToggle(userId: string, serverFollowing: boolean) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { follow, unfollow } = useFollowMutations();
  const [override, setOverride] = useState<boolean | null>(null);
  const [lastServer, setLastServer] = useState(serverFollowing);

  // Once the refreshed server state arrives it is the truth again.
  if (lastServer !== serverFollowing) {
    setLastServer(serverFollowing);
    setOverride(null);
  }

  const following = override ?? serverFollowing;
  const pending = follow.isPending || unfollow.isPending;

  const toggle = () => {
    if (pending) return;
    const next = !following;
    setOverride(next);
    (next ? follow : unfollow).mutate(userId, {
      onError: () => {
        setOverride(null);
        showError(t("social.followError"));
      },
    });
  };

  return { following, pending, toggle };
}
