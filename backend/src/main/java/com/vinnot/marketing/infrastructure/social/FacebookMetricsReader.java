package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.util.Map;
import java.util.Optional;

/**
 * Reads a Facebook Page post's metrics (#510, S6): views ({@code post_media_view}), reach
 * ({@code post_total_media_view_unique}) and likes (all reactions, {@code post_reactions_by_type_total}) from the post
 * insights ({@code post_impressions*} are deprecated since Graph API v25), plus comments and shares from the post
 * itself. Facebook leaves {@code shares} out of a post nobody shared, so that reads as zero. Saves and follows are not
 * given. Empty when the post is gone.
 */
public final class FacebookMetricsReader implements SocialMetricsReader {

    static final String METRICS = "post_media_view,post_total_media_view_unique,post_reactions_by_type_total";
    static final String FIELDS = "comments.limit(0).summary(true),shares";

    private final GraphApi graph;
    private final SocialAccountTokens tokens;
    private final Clock clock;

    FacebookMetricsReader(GraphApi graph, SocialAccountTokens tokens, Clock clock) {
        this.graph = graph;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.FACEBOOK;
    }

    @Override
    public Optional<PublicationMetrics> read(String externalId) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.FACEBOOK, clock);
        Optional<JsonNode> insights = graph.find(externalId, "insights", Map.of("metric", METRICS),
                token.accessToken());
        if (insights.isEmpty()) {
            return Optional.empty();
        }
        Optional<JsonNode> post = graph.find(externalId, null, Map.of("fields", FIELDS), token.accessToken());
        if (post.isEmpty()) {
            return Optional.empty();
        }
        Map<String, Long> values = MetaInsights.values(insights.get());
        JsonNode comments = post.get().path("comments").path("summary").path("total_count");
        return Optional.of(new PublicationMetrics(values.get("post_media_view"),
                values.get("post_total_media_view_unique"), values.get("post_reactions_by_type_total"),
                comments.isNumber() ? comments.asLong() : null, null,
                post.get().path("shares").path("count").asLong(0), null));
    }
}
