package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialPublisher;
import com.vinnot.marketing.domain.model.SocialNetwork;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Publishes a carousel on Instagram (#510, S1) through the Instagram API with Unified Login on the Facebook Graph API:
 * checks the daily publishing quota, creates one container per image (with its alt text) and the carousel container
 * with the caption, waits until Meta finished processing it, publishes it and reads its permalink. Stateless.
 */
public final class InstagramPublisher implements SocialPublisher {

    static final int MIN_IMAGES = 2;
    static final int MAX_IMAGES = 20;

    private final GraphApi graph;
    private final SocialAccountTokens tokens;
    private final StatusPoller poller;
    private final Clock clock;
    private final boolean altText;

    InstagramPublisher(GraphApi graph, SocialAccountTokens tokens, StatusPoller poller, Clock clock, boolean altText) {
        this.graph = graph;
        this.tokens = tokens;
        this.poller = poller;
        this.clock = clock;
        this.altText = altText;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.INSTAGRAM;
    }

    @Override
    public PublishResult publish(PublishRequest request) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.INSTAGRAM, clock);
        SocialAdapters.requireImages(request.imageUrls(), MIN_IMAGES, MAX_IMAGES, SocialNetwork.INSTAGRAM);
        String account = token.accountId();
        requireQuota(account, token.accessToken());
        List<String> children = new ArrayList<>();
        for (String imageUrl : request.imageUrls()) {
            Map<String, String> item = new LinkedHashMap<>();
            item.put("image_url", imageUrl);
            item.put("is_carousel_item", "true");
            if (altText && Objects.nonNull(request.altText()) && !request.altText().isBlank()) {
                item.put("alt_text", request.altText());
            }
            children.add(SocialAdapters.requiredId(graph.post(account, "media", item, token.accessToken(), true),
                    "id", "carousel item"));
        }
        Map<String, String> carousel = new LinkedHashMap<>();
        carousel.put("media_type", "CAROUSEL");
        carousel.put("children", String.join(",", children));
        carousel.put("caption", SocialAdapters.withHashtags(request.caption()));
        String container = SocialAdapters.requiredId(graph.post(account, "media", carousel, token.accessToken(), true),
                "id", "carousel");
        poller.await(() -> containerReady(container, token.accessToken()), "Instagram carousel");
        String mediaId = SocialAdapters.requiredId(graph.post(account, "media_publish",
                Map.of("creation_id", container), token.accessToken(), false), "id", "publish");
        return new PublishResult(PublishResult.Outcome.PUBLISHED, mediaId,
                SocialAdapters.permalink(graph, mediaId, "permalink", token.accessToken(), SocialNetwork.INSTAGRAM));
    }

    private void requireQuota(String account, String token) {
        JsonNode usage = graph.get(account, "content_publishing_limit", Map.of("fields", "quota_usage,config"), token)
                .path("data").path(0);
        long used = usage.path("quota_usage").asLong(0);
        long total = usage.path("config").path("quota_total").asLong(0);
        if (total > 0 && used >= total) {
            throw new SocialPublishingException(Code.RATE_LIMITED,
                    "Instagram daily publishing limit reached (" + used + "/" + total + ")");
        }
    }

    private Optional<Boolean> containerReady(String container, String token) {
        JsonNode state = graph.get(container, null, Map.of("fields", "status_code,status"), token);
        String status = state.path("status_code").asText("");
        return switch (status) {
            case "FINISHED", "PUBLISHED" -> Optional.of(true);
            case "ERROR", "EXPIRED" -> throw new SocialPublishingException(Code.MEDIA_REJECTED,
                    "Instagram container " + status + ": " + GraphApi.safe(state.path("status").asText(""), token));
            default -> Optional.empty();
        };
    }
}
