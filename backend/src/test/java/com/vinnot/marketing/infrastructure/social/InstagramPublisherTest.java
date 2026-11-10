package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult.Outcome;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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

class InstagramPublisherTest {

    private static final NetworkCaption CAPTION = new NetworkCaption("Malbec, explained.\nVinnot", null,
            List.of("vino", "#malbec", " "), null);
    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final ManualClock clock = new ManualClock();

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void publishesTheCarouselAfterTheContainerFinishes() {
        happyPath();
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"IN_PROGRESS\"}");
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"FINISHED\"}");

        var result = publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION));

        assertThat(result.outcome()).isEqualTo(Outcome.PUBLISHED);
        assertThat(result.externalId()).isEqualTo("m77");
        assertThat(result.permalink()).isEqualTo("https://www.instagram.com/p/abc/");
        assertThat(publisher(true).network()).isEqualTo(SocialNetwork.INSTAGRAM);
        var limit = server.only("GET", "/v27.0/1789/content_publishing_limit");
        assertThat(limit.queryParams()).containsEntry("fields", "quota_usage,config");
        var media = server.all("POST", "/v27.0/1789/media");
        assertThat(media).hasSize(3);
        assertThat(media.get(0).form()).containsEntry("image_url", IMAGES.get(0)).containsEntry("is_carousel_item", "true")
                .containsEntry("alt_text", "Slides about Malbec").containsEntry("access_token", TOKEN);
        assertThat(media.get(1).form()).containsEntry("image_url", IMAGES.get(1));
        assertThat(media.get(2).form()).containsEntry("media_type", "CAROUSEL").containsEntry("children", "c1,c2")
                .containsEntry("caption", "Malbec, explained.\nVinnot\n\n#vino #malbec");
        assertThat(server.all("GET", "/v27.0/c9")).hasSize(2)
                .allSatisfy(poll -> assertThat(poll.queryParams()).containsEntry("fields", "status_code,status"));
        assertThat(server.only("POST", "/v27.0/1789/media_publish").form()).containsEntry("creation_id", "c9");
        assertThat(server.only("GET", "/v27.0/m77").queryParams()).containsEntry("fields", "permalink");
        assertThat(clock.sleeps()).isEqualTo(1);
    }

    @Test
    void altTextCanBeSwitchedOffAndIsSkippedWhenBlank() {
        happyPath();
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"FINISHED\"}");

        publisher(false).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION));
        publisher(true).publish(new PublishRequest(UUID.randomUUID(), SocialNetwork.INSTAGRAM, IMAGES, " ", CAPTION));

        assertThat(server.all("POST", "/v27.0/1789/media")).filteredOn(r -> r.form().containsKey("image_url"))
                .hasSize(4).allSatisfy(r -> assertThat(r.form()).doesNotContainKey("alt_text"));
    }

    @Test
    void anAlreadyPublishedContainerCountsAsReadyAndAMissingPermalinkIsNull() {
        happyPath();
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"PUBLISHED\"}");
        server.replace("GET", "/v27.0/m77", 500, "{}");

        var result = publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION));

        assertThat(result.outcome()).isEqualTo(Outcome.PUBLISHED);
        assertThat(result.externalId()).isEqualTo("m77");
        assertThat(result.permalink()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ERROR", "EXPIRED"})
    void aFailedContainerIsAMediaRejection(String status) {
        happyPath();
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"" + status + "\",\"status\":\"Error: 2207004\"}");

        var failure = failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(Code.MEDIA_REJECTED);
        assertThat(failure.detail()).contains(status).contains("2207004");
        assertThat(server.all("POST", "/v27.0/1789/media_publish")).isEmpty();
    }

    @Test
    void aContainerStillProcessingAtTheDeadlineTimesOut() {
        happyPath();
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"IN_PROGRESS\"}");

        var failure = failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(Code.PROCESSING_TIMEOUT);
        assertThat(failure.retryable()).isTrue();
        assertThat(clock.instant()).isEqualTo(NOW.plus(Duration.ofMinutes(5)));
        assertThat(server.all("POST", "/v27.0/1789/media_publish")).isEmpty();
    }

    @Test
    void anExhaustedDailyQuotaIsRateLimitedBeforeAnyUpload() {
        server.on("GET", "/v27.0/1789/content_publishing_limit", 200,
                "{\"data\":[{\"quota_usage\":50,\"config\":{\"quota_total\":50,\"quota_duration\":86400}}]}");

        var failure = failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(Code.RATE_LIMITED);
        assertThat(server.all("POST", "/v27.0/1789/media")).isEmpty();
    }

    @Test
    void anUnknownQuotaShapeDoesNotBlockPublishing() {
        happyPath();
        server.on("GET", "/v27.0/1789/content_publishing_limit", 200, "{\"data\":[]}");
        server.on("GET", "/v27.0/c9", 200, "{\"status_code\":\"FINISHED\"}");

        assertThat(publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION)).externalId())
                .isEqualTo("m77");
    }

    @Test
    void aRejectedImageStopsTheCarousel() {
        server.on("GET", "/v27.0/1789/content_publishing_limit", 200, "{\"data\":[{\"quota_usage\":1}]}");
        server.on("POST", "/v27.0/1789/media", 400, GraphApiTest.error(9004, 2207052, "Media fetch failed", false));

        var failure = failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(Code.MEDIA_REJECTED);
        assertThat(server.all("POST", "/v27.0/1789/media")).hasSize(1);
    }

    @Test
    void anAnswerWithoutAnIdIsRejected() {
        server.on("GET", "/v27.0/1789/content_publishing_limit", 200, "{\"data\":[]}");
        server.on("POST", "/v27.0/1789/media", 200, "{}");

        assertThat(failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION))).code())
                .isEqualTo(Code.REJECTED);
    }

    @Test
    void anExpiredOrInvalidTokenIsTokenInvalid() {
        server.on("GET", "/v27.0/1789/content_publishing_limit", 400, GraphApiTest.error(190, 463, "Expired", false));

        assertThat(failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION))).code())
                .isEqualTo(Code.TOKEN_INVALID);
        SocialAccountTokens expired = tokens(Map.of(SocialNetwork.INSTAGRAM,
                new SocialAccessToken(TOKEN, "1789", NOW.minusSeconds(1))));
        var publisher = new InstagramPublisher(graph(), expired, poller(clock, Duration.ofSeconds(15),
                Duration.ofMinutes(5)), clock, true);
        assertThat(failure(() -> publisher.publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION))).code())
                .isEqualTo(Code.TOKEN_INVALID);
    }

    @Test
    void withoutAnAccountItIsNotConnectedAndCallsNothing() {
        var publisher = new InstagramPublisher(graph(), none(), poller(clock, Duration.ofSeconds(15),
                Duration.ofMinutes(5)), clock, true);
        var blank = new InstagramPublisher(graph(), tokens(Map.of(SocialNetwork.INSTAGRAM,
                new SocialAccessToken(" ", "1789", null))), poller(clock, Duration.ofSeconds(15),
                Duration.ofMinutes(5)), clock, true);

        assertThat(failure(() -> publisher.publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION))).code())
                .isEqualTo(Code.NOT_CONNECTED);
        assertThat(failure(() -> blank.publish(request(SocialNetwork.INSTAGRAM, IMAGES, CAPTION))).code())
                .isEqualTo(Code.NOT_CONNECTED);
        assertThat(server.requests()).isEmpty();
    }

    @Test
    void aCarouselNeedsTwoToTwentyImages() {
        var one = List.of(IMAGES.getFirst());
        var many = Collections.nCopies(21, IMAGES.getFirst());

        assertThat(failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, one, CAPTION))).code())
                .isEqualTo(Code.REJECTED);
        assertThat(failure(() -> publisher(true).publish(request(SocialNetwork.INSTAGRAM, many, CAPTION))).code())
                .isEqualTo(Code.REJECTED);
        assertThat(server.requests()).isEmpty();
    }

    private void happyPath() {
        server.on("GET", "/v27.0/1789/content_publishing_limit", 200,
                "{\"data\":[{\"quota_usage\":3,\"config\":{\"quota_total\":50,\"quota_duration\":86400}}]}");
        server.on("POST", "/v27.0/1789/media", 200, "{\"id\":\"c1\"}");
        server.on("POST", "/v27.0/1789/media", 200, "{\"id\":\"c2\"}");
        server.on("POST", "/v27.0/1789/media", 200, "{\"id\":\"c9\"}");
        server.on("POST", "/v27.0/1789/media_publish", 200, "{\"id\":\"m77\"}");
        server.on("GET", "/v27.0/m77", 200, "{\"permalink\":\"https://www.instagram.com/p/abc/\",\"id\":\"m77\"}");
    }

    private GraphApi graph() {
        return new GraphApi(transport(), server.baseUrl(), "v27.0");
    }

    private InstagramPublisher publisher(boolean altText) {
        return new InstagramPublisher(graph(), tokens(SocialNetwork.INSTAGRAM, "1789"),
                poller(clock, Duration.ofSeconds(15), Duration.ofMinutes(5)), clock, altText);
    }
}
