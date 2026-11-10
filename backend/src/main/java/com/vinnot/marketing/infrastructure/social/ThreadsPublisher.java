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
import java.util.Optional;

/**
 * Publishes a carousel on Threads (#510, S1): one image container per slide, the carousel container with the text
 * (already at most 500 characters) and its one topic tag, a wait until Threads finished processing it (Meta suggests
 * about 30 seconds), the publish and the permalink. Threads takes no hashtags list: its tag is the topic tag. Stateless.
 */
public final class ThreadsPublisher implements SocialPublisher {

    static final int MIN_IMAGES = 2;
    static final int MAX_IMAGES = 20;

    private final GraphApi graph;
    private final SocialAccountTokens tokens;
    private final StatusPoller poller;
    private final Clock clock;

    ThreadsPublisher(GraphApi graph, SocialAccountTokens tokens, StatusPoller poller, Clock clock) {
        this.graph = graph;
        this.tokens = tokens;
        this.poller = poller;
        this.clock = clock;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.THREADS;
    }

    @Override
    public PublishResult publish(PublishRequest request) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.THREADS, clock);
        SocialAdapters.requireImages(request.imageUrls(), MIN_IMAGES, MAX_IMAGES, SocialNetwork.THREADS);
        String user = token.accountId();
        List<String> children = new ArrayList<>();
        for (String imageUrl : request.imageUrls()) {
            children.add(SocialAdapters.requiredId(graph.post(user, "threads",
                    Map.of("media_type", "IMAGE", "image_url", imageUrl, "is_carousel_item", "true"),
                    token.accessToken(), true), "id", "carousel item"));
        }
        Map<String, String> carousel = new LinkedHashMap<>();
        carousel.put("media_type", "CAROUSEL");
        carousel.put("children", String.join(",", children));
        carousel.put("text", request.caption().text());
        String topic = SocialAdapters.bareTag(request.caption().topicTag());
        if (!topic.isEmpty()) {
            carousel.put("topic_tag", topic);
        }
        String container = SocialAdapters.requiredId(graph.post(user, "threads", carousel, token.accessToken(), true),
                "id", "carousel");
        poller.await(() -> containerReady(container, token.accessToken()), "Threads carousel");
        String threadId = SocialAdapters.requiredId(graph.post(user, "threads_publish",
                Map.of("creation_id", container), token.accessToken(), false), "id", "publish");
        return new PublishResult(PublishResult.Outcome.PUBLISHED, threadId,
                SocialAdapters.permalink(graph, threadId, "permalink", token.accessToken(), SocialNetwork.THREADS));
    }

    private Optional<Boolean> containerReady(String container, String token) {
        JsonNode state = graph.get(container, null, Map.of("fields", "status,error_message"), token);
        String status = state.path("status").asText("");
        return switch (status) {
            case "FINISHED", "PUBLISHED" -> Optional.of(true);
            case "ERROR", "EXPIRED" -> throw new SocialPublishingException(Code.MEDIA_REJECTED,
                    "Threads container " + status + ": " + GraphApi.safe(state.path("error_message").asText(""), token));
            default -> Optional.empty();
        };
    }
}
