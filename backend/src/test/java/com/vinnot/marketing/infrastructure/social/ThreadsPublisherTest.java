package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.PublishResult.Outcome;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Duration;
import java.util.List;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.IMAGES;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.NOW;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.TOKEN;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.none;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.poller;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.request;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.tokens;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.transport;
import static org.assertj.core.api.Assertions.assertThat;

class ThreadsPublisherTest {

    private static final NetworkCaption CAPTION = new NetworkCaption("Malbec, explained. Vinnot", null,
            List.of("vino"), "#Wine Talk");
    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final ManualClock clock = new ManualClock();

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void publishesTheCarouselWithItsTopicTagOnceTheContainerFinishes() {
        happyPath();
        server.on("GET", "/v1.0/c9", 200, "{\"status\":\"IN_PROGRESS\"}");
        server.on("GET", "/v1.0/c9", 200, "{\"status\":\"FINISHED\"}");

        var result = publisher().publish(request(SocialNetwork.THREADS, IMAGES, CAPTION));

        assertThat(result.outcome()).isEqualTo(Outcome.PUBLISHED);
        assertThat(result.externalId()).isEqualTo("t77");
        assertThat(result.permalink()).isEqualTo("https://www.threads.com/@vinnot/post/abc");
        assertThat(publisher().network()).isEqualTo(SocialNetwork.THREADS);
        var containers = server.all("POST", "/v1.0/24/threads");
        assertThat(containers).hasSize(3);
        assertThat(containers.get(0).form()).containsEntry("media_type", "IMAGE")
                .containsEntry("image_url", IMAGES.get(0)).containsEntry("is_carousel_item", "true")
                .containsEntry("access_token", TOKEN);
        assertThat(containers.get(2).form()).containsEntry("media_type", "CAROUSEL").containsEntry("children", "c1,c2")
                .containsEntry("text", "Malbec, explained. Vinnot").containsEntry("topic_tag", "Wine Talk");
        assertThat(server.all("GET", "/v1.0/c9")).allSatisfy(poll ->
                assertThat(poll.queryParams()).containsEntry("fields", "status,error_message"));
        assertThat(server.only("POST", "/v1.0/24/threads_publish").form()).containsEntry("creation_id", "c9");
        assertThat(server.only("GET", "/v1.0/t77").queryParams()).containsEntry("fields", "permalink");
    }

    @Test
    void withoutATopicTagTheCarouselOmitsItAndAPermalinkFailureIsTolerated() {
        happyPath();
        server.on("GET", "/v1.0/c9", 200, "{\"status\":\"FINISHED\"}");
        server.replace("GET", "/v1.0/t77", 503, "");

        var result = publisher().publish(request(SocialNetwork.THREADS, IMAGES,
                new NetworkCaption("Text", null, List.of(), " # ")));

        assertThat(result.permalink()).isNull();
        assertThat(server.all("POST", "/v1.0/24/threads").get(2).form()).doesNotContainKey("topic_tag");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ERROR", "EXPIRED"})
    void aFailedContainerIsAMediaRejection(String status) {
        happyPath();
        server.on("GET", "/v1.0/c9", 200, "{\"status\":\"" + status + "\",\"error_message\":\"FAILED_DOWNLOADING_IMAGE\"}");

        var failure = failure(() -> publisher().publish(request(SocialNetwork.THREADS, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(Code.MEDIA_REJECTED);
        assertThat(failure.detail()).contains("FAILED_DOWNLOADING_IMAGE");
        assertThat(server.all("POST", "/v1.0/24/threads_publish")).isEmpty();
    }

    @Test
    void aContainerThatNeverFinishesTimesOut() {
        happyPath();
        server.on("GET", "/v1.0/c9", 200, "{\"status\":\"IN_PROGRESS\"}");

        assertThat(failure(() -> publisher().publish(request(SocialNetwork.THREADS, IMAGES, CAPTION))).code())
                .isEqualTo(Code.PROCESSING_TIMEOUT);
        assertThat(clock.instant()).isEqualTo(NOW.plus(Duration.ofMinutes(5)));
    }

    @Test
    void anInvalidTokenRateLimitAndNotConnectedAreMapped() {
        server.on("POST", "/v1.0/24/threads", 400, GraphApiTest.error(190, 0, "Expired", false));
        assertThat(failure(() -> publisher().publish(request(SocialNetwork.THREADS, IMAGES, CAPTION))).code())
                .isEqualTo(Code.TOKEN_INVALID);

        var disconnected = new ThreadsPublisher(graph(), none(), poller(clock, Duration.ofSeconds(15),
                Duration.ofMinutes(5)), clock);
        assertThat(failure(() -> disconnected.publish(request(SocialNetwork.THREADS, IMAGES, CAPTION))).code())
                .isEqualTo(Code.NOT_CONNECTED);
    }

    @Test
    void aCarouselNeedsAtLeastTwoImages() {
        assertThat(failure(() -> publisher().publish(request(SocialNetwork.THREADS, List.of(IMAGES.getFirst()),
                CAPTION))).code()).isEqualTo(Code.REJECTED);
        assertThat(server.requests()).isEmpty();
    }

    private void happyPath() {
        server.on("POST", "/v1.0/24/threads", 200, "{\"id\":\"c1\"}");
        server.on("POST", "/v1.0/24/threads", 200, "{\"id\":\"c2\"}");
        server.on("POST", "/v1.0/24/threads", 200, "{\"id\":\"c9\"}");
        server.on("POST", "/v1.0/24/threads_publish", 200, "{\"id\":\"t77\"}");
        server.on("GET", "/v1.0/t77", 200, "{\"permalink\":\"https://www.threads.com/@vinnot/post/abc\"}");
    }

    private GraphApi graph() {
        return new GraphApi(transport(), server.baseUrl(), "v1.0");
    }

    private ThreadsPublisher publisher() {
        return new ThreadsPublisher(graph(), tokens(SocialNetwork.THREADS, "24"),
                poller(clock, Duration.ofSeconds(15), Duration.ofMinutes(5)), clock);
    }
}
