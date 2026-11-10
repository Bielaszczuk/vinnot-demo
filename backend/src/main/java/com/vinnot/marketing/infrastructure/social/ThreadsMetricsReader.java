package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;

import java.time.Clock;
import java.util.Map;
import java.util.Optional;

/**
 * Reads a Threads post's media insights (#510, S6): views and likes as they are, replies as comments, and reposts,
 * quotes and shares added up as shares. Threads gives no reach, saves or follows per post. Empty when Threads has no
 * data yet or the post is gone.
 */
public final class ThreadsMetricsReader implements SocialMetricsReader {

    static final String METRICS = "views,likes,replies,reposts,quotes,shares";

    private final GraphApi graph;
    private final SocialAccountTokens tokens;
    private final Clock clock;

    ThreadsMetricsReader(GraphApi graph, SocialAccountTokens tokens, Clock clock) {
        this.graph = graph;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.THREADS;
    }

    @Override
    public Optional<PublicationMetrics> read(String externalId) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.THREADS, clock);
        return graph.find(externalId, "insights", Map.of("metric", METRICS), token.accessToken())
                .map(MetaInsights::values).filter(values -> !values.isEmpty())
                .map(values -> new PublicationMetrics(values.get("views"), null, values.get("likes"),
                        values.get("replies"), null,
                        MetaInsights.sum(values.get("reposts"), values.get("quotes"), values.get("shares")), null));
    }
}
