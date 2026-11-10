package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.model.DraftCheck;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialDraftTracker;
import com.vinnot.marketing.domain.model.SocialNetwork;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.util.Map;

/**
 * Checks a TikTok inbox draft with one {@code status/fetch} call (#516 S1). {@code PUBLISH_COMPLETE} means the creator
 * posted it; only when TikTok already gives the public post's id is the creator's name read ({@code creator_info}) to build
 * its link. Any other status means it is still waiting or processing. A {@code FAILED} draft and API errors throw with the
 * same codes as publishing (an unknown {@code publish_id} is TikTok's {@code invalid_publish_id}, a rejection). Stateless.
 */
public final class TikTokDraftTracker implements SocialDraftTracker {

    private final TikTokApi api;
    private final SocialAccountTokens tokens;
    private final Clock clock;

    TikTokDraftTracker(TikTokApi api, SocialAccountTokens tokens, Clock clock) {
        this.api = api;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.TIKTOK;
    }

    @Override
    public DraftCheck check(String externalId) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.TIKTOK, clock);
        JsonNode data = api.post(TikTokPublisher.STATUS, Map.of("publish_id", externalId), token.accessToken());
        return switch (data.path("status").asText("")) {
            case "PUBLISH_COMPLETE" -> posted(data, token.accessToken());
            case "FAILED" -> {
                String reason = data.path("fail_reason").asText("");
                throw new SocialPublishingException(TikTokApi.failReason(reason), "TikTok draft failed: " + reason);
            }
            default -> DraftCheck.pending();
        };
    }

    private DraftCheck posted(JsonNode status, String token) {
        String postId = TikTokPublisher.publicPostId(status);
        if (postId.isBlank()) {
            return DraftCheck.posted(null);
        }
        String username = api.post(TikTokPublisher.CREATOR_INFO, null, token).path("creator_username").asText("");
        return DraftCheck.posted(TikTokPublisher.permalink(username, postId));
    }
}
