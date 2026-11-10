package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialPublisher;
import com.vinnot.marketing.domain.model.SocialNetwork;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Publishes a multi-photo post on the Facebook Page (#510, S1) with a Page access token: uploads every image as an
 * unpublished photo, then publishes one feed post with the caption and the photos attached ({@code attached_media}),
 * and reads its permalink. Photos left unpublished by a failed attempt never show on the Page. Stateless.
 */
public final class FacebookPublisher implements SocialPublisher {

    static final int MIN_IMAGES = 1;
    /** Meta documents no limit for attached photos; this only guards against an absurd request. */
    static final int MAX_IMAGES = 50;

    private final GraphApi graph;
    private final SocialAccountTokens tokens;
    private final Clock clock;
    private final ObjectMapper mapper;

    FacebookPublisher(GraphApi graph, SocialAccountTokens tokens, Clock clock, ObjectMapper mapper) {
        this.graph = graph;
        this.tokens = tokens;
        this.clock = clock;
        this.mapper = mapper;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.FACEBOOK;
    }

    @Override
    public PublishResult publish(PublishRequest request) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.FACEBOOK, clock);
        SocialAdapters.requireImages(request.imageUrls(), MIN_IMAGES, MAX_IMAGES, SocialNetwork.FACEBOOK);
        String page = token.accountId();
        Map<String, String> post = new LinkedHashMap<>();
        post.put("message", SocialAdapters.withHashtags(request.caption()));
        List<String> images = request.imageUrls();
        for (int index = 0; index < images.size(); index++) {
            String photo = SocialAdapters.requiredId(graph.post(page, "photos",
                    Map.of("url", images.get(index), "published", "false"), token.accessToken(), true), "id", "photo");
            post.put("attached_media[" + index + "]", mapper.writeValueAsString(Map.of("media_fbid", photo)));
        }
        String postId = SocialAdapters.requiredId(graph.post(page, "feed", post, token.accessToken(), false),
                "id", "feed post");
        return new PublishResult(PublishResult.Outcome.PUBLISHED, postId,
                SocialAdapters.permalink(graph, postId, "permalink_url", token.accessToken(), SocialNetwork.FACEBOOK));
    }
}
