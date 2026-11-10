package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.TOKEN;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.none;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.tokens;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.transport;
import static org.assertj.core.api.Assertions.assertThat;

class SocialMetricsReadersTest {

    private static final List<String> IG_METRICS = List.of("views", "reach", "likes", "comments", "saved", "shares",
            "follows");
    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final ManualClock clock = new ManualClock();

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void instagramReadsEveryMetricItGives() {
        server.on("GET", "/v27.0/m77/insights", 200, insights(
                "views", 900, "reach", 700, "likes", 50, "comments", 4, "saved", 9, "shares", 3, "follows", 2));

        var metrics = instagram().read("m77");

        assertThat(metrics).contains(new PublicationMetrics(900L, 700L, 50L, 4L, 9L, 3L, 2L));
        var request = server.only("GET", "/v27.0/m77/insights");
        assertThat(request.queryParams()).containsEntry("metric", "views,reach,likes,comments,saved,shares,follows");
        assertThat(request.authorization()).isEqualTo("Bearer " + TOKEN);
        assertThat(instagram().network()).isEqualTo(SocialNetwork.INSTAGRAM);
    }

    @Test
    void instagramLeavesTheMetricsItDoesNotGiveNull() {
        server.on("GET", "/v27.0/m77/insights", 200, "{\"data\":[{\"name\":\"views\",\"period\":\"lifetime\","
                + "\"values\":[{\"value\":120}]},{\"name\":\"likes\",\"total_value\":{\"value\":7}},"
                + "{\"name\":\"reach\",\"values\":[]},{\"name\":\"unknown\",\"values\":[{\"value\":1}]}]}");

        assertThat(instagram().read("m77")).contains(new PublicationMetrics(120L, null, 7L, null, null, null, null));
    }

    @Test
    void instagramHasNothingForAnEmptyAnswerOrADeletedPost() {
        server.on("GET", "/v27.0/m77/insights", 200, "{\"data\":[]}");
        server.on("GET", "/v27.0/gone/insights", 400, GraphApiTest.error(100, 33, "Object does not exist", false));

        assertThat(instagram().read("m77")).isEmpty();
        assertThat(instagram().read("gone")).isEmpty();
    }

    @Test
    void instagramFailsOnAuthenticationAndWhenNotConnected() {
        server.on("GET", "/v27.0/m77/insights", 400, GraphApiTest.error(190, 0, "Expired", false));

        assertThat(failure(() -> instagram().read("m77")).code()).isEqualTo(Code.TOKEN_INVALID);
        var disconnected = new InstagramMetricsReader(graph("v27.0"), none(), clock, IG_METRICS);
        assertThat(failure(() -> disconnected.read("m77")).code()).isEqualTo(Code.NOT_CONNECTED);
    }

    @Test
    void facebookAddsReactionsAndReadsCommentsAndSharesFromThePost() {
        server.on("GET", "/v27.0/555_900/insights", 200, "{\"data\":["
                + "{\"name\":\"post_media_view\",\"period\":\"lifetime\",\"values\":[{\"value\":1500}]},"
                + "{\"name\":\"post_total_media_view_unique\",\"values\":[{\"value\":1100}]},"
                + "{\"name\":\"post_reactions_by_type_total\",\"values\":[{\"value\":{\"like\":30,\"love\":5}}]}]}");
        server.on("GET", "/v27.0/555_900", 200,
                "{\"id\":\"555_900\",\"comments\":{\"data\":[],\"summary\":{\"total_count\":6}},\"shares\":{\"count\":2}}");

        var metrics = facebook().read("555_900");

        assertThat(metrics).contains(new PublicationMetrics(1500L, 1100L, 35L, 6L, null, 2L, null));
        assertThat(server.only("GET", "/v27.0/555_900/insights").queryParams()).containsEntry("metric",
                "post_media_view,post_total_media_view_unique,post_reactions_by_type_total");
        assertThat(server.only("GET", "/v27.0/555_900").queryParams()).containsEntry("fields",
                "comments.limit(0).summary(true),shares");
        assertThat(facebook().network()).isEqualTo(SocialNetwork.FACEBOOK);
    }

    @Test
    void facebookCountsAbsentSharesAsNoneAndMissingInsightsAsNull() {
        server.on("GET", "/v27.0/555_900/insights", 200, "{\"data\":[{\"name\":\"post_reactions_by_type_total\","
                + "\"values\":[{\"value\":{}}]}]}");
        server.on("GET", "/v27.0/555_900", 200, "{\"id\":\"555_900\"}");

        assertThat(facebook().read("555_900")).contains(new PublicationMetrics(null, null, 0L, null, null, 0L, null));
    }

    @Test
    void facebookHasNothingForADeletedPost() {
        server.on("GET", "/v27.0/555_900/insights", 400, GraphApiTest.error(100, 33, "Object does not exist", false));

        assertThat(facebook().read("555_900")).isEmpty();
        assertThat(server.all("GET", "/v27.0/555_900")).isEmpty();
    }

    @Test
    void facebookHasNothingWhenThePostVanishesBetweenTheTwoReads() {
        server.on("GET", "/v27.0/555_900/insights", 200, "{\"data\":[]}");
        server.on("GET", "/v27.0/555_900", 404, "");

        assertThat(facebook().read("555_900")).isEmpty();
    }

    @Test
    void facebookFailsWhenNotConnected() {
        var disconnected = new FacebookMetricsReader(graph("v27.0"), none(), clock);

        assertThat(failure(() -> disconnected.read("555_900")).code()).isEqualTo(Code.NOT_CONNECTED);
    }

    @Test
    void threadsMapsRepliesToCommentsAndAddsRepostsQuotesAndShares() {
        server.on("GET", "/v1.0/t77/insights", 200, insights(
                "views", 400, "likes", 20, "replies", 3, "reposts", 2, "quotes", 1, "shares", 4));

        assertThat(threads().read("t77")).contains(new PublicationMetrics(400L, null, 20L, 3L, null, 7L, null));
        assertThat(server.only("GET", "/v1.0/t77/insights").queryParams())
                .containsEntry("metric", "views,likes,replies,reposts,quotes,shares");
        assertThat(threads().network()).isEqualTo(SocialNetwork.THREADS);
    }

    @Test
    void threadsLeavesSharesNullWhenNoneOfItsPartsAreGiven() {
        server.on("GET", "/v1.0/t77/insights", 200, insights("views", 10));
        server.on("GET", "/v1.0/t78/insights", 200, "{\"data\":[]}");

        assertThat(threads().read("t77")).contains(new PublicationMetrics(10L, null, null, null, null, null, null));
        assertThat(threads().read("t78")).isEmpty();
    }

    @Test
    void threadsFailsOnRateLimitsAndWhenNotConnected() {
        server.on("GET", "/v1.0/t77/insights", 429, "");

        assertThat(failure(() -> threads().read("t77")).code()).isEqualTo(Code.RATE_LIMITED);
        var disconnected = new ThreadsMetricsReader(graph("v1.0"), none(), clock);
        assertThat(failure(() -> disconnected.read("t77")).code()).isEqualTo(Code.NOT_CONNECTED);
    }

    @Test
    void tiktokHasNoMetricsForPhotoPostsAndDraftsAndCallsNothing() {
        var reader = new TikTokMetricsReader();

        assertThat(reader.network()).isEqualTo(SocialNetwork.TIKTOK);
        assertThat(reader.read("p1")).isEmpty();
        assertThat(server.requests()).isEmpty();
    }

    private static String insights(Object... pairs) {
        var data = new StringBuilder("{\"data\":[");
        for (int i = 0; i < pairs.length; i += 2) {
            data.append(i == 0 ? "" : ",").append("{\"name\":\"").append(pairs[i])
                    .append("\",\"period\":\"lifetime\",\"values\":[{\"value\":").append(pairs[i + 1]).append("}]}");
        }
        return data.append("]}").toString();
    }

    private GraphApi graph(String version) {
        return new GraphApi(transport(), server.baseUrl(), version);
    }

    private InstagramMetricsReader instagram() {
        return new InstagramMetricsReader(graph("v27.0"), tokens(SocialNetwork.INSTAGRAM, "1789"), clock, IG_METRICS);
    }

    private FacebookMetricsReader facebook() {
        return new FacebookMetricsReader(graph("v27.0"), tokens(SocialNetwork.FACEBOOK, "555"), clock);
    }

    private ThreadsMetricsReader threads() {
        return new ThreadsMetricsReader(graph("v1.0"), tokens(SocialNetwork.THREADS, "24"), clock);
    }
}
