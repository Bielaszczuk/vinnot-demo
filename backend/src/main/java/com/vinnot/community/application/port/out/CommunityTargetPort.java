package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.ContentTarget;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface CommunityTargetPort {
    /** Resolves only public reportable content and derives the author on the server. */
    Optional<TargetDetails> findPublic(ContentTarget target);

    /**
     * Names a whole moderation page in one lookup: what each target is about and who each user
     * is. Deleted or missing entities are simply absent from the maps.
     */
    ModerationNames describe(Set<ContentTarget> targets, Set<UUID> users);

    record TargetDetails(UUID authorId, String excerpt) { }

    /**
     * @param targetLabels wine name for a review or comment, event title, route name, or username
     * @param usernames    username per user id
     */
    record ModerationNames(Map<ContentTarget, String> targetLabels, Map<UUID, String> usernames) {
        public ModerationNames {
            targetLabels = Map.copyOf(targetLabels);
            usernames = Map.copyOf(usernames);
        }
    }
}
