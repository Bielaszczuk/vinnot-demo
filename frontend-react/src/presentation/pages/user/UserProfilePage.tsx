import { CommunityActivityLink } from "@components/features/community/CommunityOverview";
import { useUserProfileViewModel } from "./useUserProfileViewModel";
import {
  UserProfileHeroSection,
  UserProfileTabContent,
  UserProfileTabNavigation,
} from "./UserProfileSections";

/**
 * UserProfilePage — "Mi perfil" page
 *
 * Orchestrates view-model state and delegates UI rendering to focused sections.
 */
export function UserProfilePage() {
  const vm = useUserProfileViewModel();

  return (
    <div className="min-h-[80vh]">
      <UserProfileHeroSection vm={vm} />
      <CommunityActivityLink />
      <UserProfileTabNavigation vm={vm} />
      <UserProfileTabContent vm={vm} />
    </div>
  )
}
