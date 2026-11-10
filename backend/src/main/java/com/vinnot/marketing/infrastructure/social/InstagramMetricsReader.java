package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Reads an Instagram post's media insights (#510, S6): views, reach, likes, comments, saved, shares and, when
 * configured, follows ({@code impressions} is deprecated for media since July 2024). Meta refuses the whole call if one
 * metric is not valid for the media, so the list is configurable. Empty when Meta has no data yet or the post is gone.
 */
public final class InstagramMetricsReader implements SocialMetricsReader {

    private final GraphApi graph;
    private final SocialAccountTokens tokens;
    private final Clock clock;
    private final String metrics;

    InstagramMetricsReader(GraphApi graph, SocialAccountTokens tokens, Clock clock, List<String> metrics) {
        this.graph = graph;
        this.tokens = tokens;
        this.clock = clock;
        this.metrics = String.join(",", metrics);
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.INSTAGRAM;
    }

    @Override
    public Optional<PublicationMetrics> read(String externalId) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.INSTAGRAM, clock);
        return graph.find(externalId, "insights", Map.of("metric", metrics), token.accessToken())
                .map(MetaInsights::values).filter(values -> !values.isEmpty())
                .map(values -> new PublicationMetrics(values.get("views"), values.get("reach"), values.get("likes"),
                        values.get("comments"), values.get("saved"), values.get("shares"), values.get("follows")));
    }
}
