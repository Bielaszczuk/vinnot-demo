package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.PublishResult.Outcome;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.IMAGES;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.TOKEN;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.none;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.request;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.tokens;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.transport;
import static org.assertj.core.api.Assertions.assertThat;

class FacebookPublisherTest {

    private static final NetworkCaption CAPTION = new NetworkCaption("Malbec, explained.", null,
            List.of("vino"), null);
    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final ManualClock clock = new ManualClock();

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void uploadsUnpublishedPhotosAndPublishesOneFeedPostWithThemAttached() {
        happyPath();

        var result = publisher().publish(request(SocialNetwork.FACEBOOK, IMAGES, CAPTION));

        assertThat(result.outcome()).isEqualTo(Outcome.PUBLISHED);
        assertThat(result.externalId()).isEqualTo("555_900");
        assertThat(result.permalink()).isEqualTo("https://www.facebook.com/555/posts/900");
        assertThat(publisher().network()).isEqualTo(SocialNetwork.FACEBOOK);
        var photos = server.all("POST", "/v27.0/555/photos");
        assertThat(photos).hasSize(2);
        assertThat(photos.get(0).form()).containsEntry("url", IMAGES.get(0)).containsEntry("published", "false")
                .containsEntry("access_token", TOKEN);
        assertThat(photos.get(1).form()).containsEntry("url", IMAGES.get(1));
        var feed = server.only("POST", "/v27.0/555/feed").form();
        assertThat(feed).containsEntry("message", "Malbec, explained.\n\n#vino")
                .containsEntry("attached_media[0]", "{\"media_fbid\":\"p1\"}")
                .containsEntry("attached_media[1]", "{\"media_fbid\":\"p2\"}");
        assertThat(server.only("GET", "/v27.0/555_900").queryParams()).containsEntry("fields", "permalink_url");
    }

    @Test
    void aPermalinkLookupFailureStillReportsThePublishedPost() {
        happyPath();
        server.replace("GET", "/v27.0/555_900", 400, GraphApiTest.error(100, 0, "Unsupported", false));

        var result = publisher().publish(request(SocialNetwork.FACEBOOK, IMAGES, CAPTION));

        assertThat(result.externalId()).isEqualTo("555_900");
        assertThat(result.permalink()).isNull();
    }

    @Test
    void aRejectedPhotoIsAMediaRejectionAndNothingIsPosted() {
        server.on("POST", "/v27.0/555/photos", 400, GraphApiTest.error(324, 0, "Missing or invalid image file", false));

        assertThat(failure(() -> publisher().publish(request(SocialNetwork.FACEBOOK, IMAGES, CAPTION))).code())
                .isEqualTo(Code.MEDIA_REJECTED);
        assertThat(server.all("POST", "/v27.0/555/feed")).isEmpty();
    }

    @Test
    void aRateLimitedFeedPostIsRetryable() {
        server.on("POST", "/v27.0/555/photos", 200, "{\"id\":\"p1\"}");
        server.on("POST", "/v27.0/555/feed", 400, GraphApiTest.error(32, 0, "Page request limit reached", false));

        var failure = failure(() -> publisher().publish(request(SocialNetwork.FACEBOOK, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(Code.RATE_LIMITED);
        assertThat(failure.retryable()).isTrue();
    }

    @Test
    void anInvalidPageTokenIsTokenInvalid() {
        server.on("POST", "/v27.0/555/photos", 401, GraphApiTest.error(190, 0, "Invalid OAuth access token", false));

        assertThat(failure(() -> publisher().publish(request(SocialNetwork.FACEBOOK, IMAGES, CAPTION))).code())
                .isEqualTo(Code.TOKEN_INVALID);
    }

    @Test
    void withoutAPageItIsNotConnectedAndWithoutImagesItIsRejected() {
        var disconnected = new FacebookPublisher(graph(), none(), clock, new ObjectMapper());

        assertThat(failure(() -> disconnected.publish(request(SocialNetwork.FACEBOOK, IMAGES, CAPTION))).code())
                .isEqualTo(Code.NOT_CONNECTED);
        assertThat(failure(() -> publisher().publish(request(SocialNetwork.FACEBOOK, List.of(), CAPTION))).code())
                .isEqualTo(Code.REJECTED);
        assertThat(server.requests()).isEmpty();
    }

    private void happyPath() {
        server.on("POST", "/v27.0/555/photos", 200, "{\"id\":\"p1\"}");
        server.on("POST", "/v27.0/555/photos", 200, "{\"id\":\"p2\"}");
        server.on("POST", "/v27.0/555/feed", 200, "{\"id\":\"555_900\"}");
        server.on("GET", "/v27.0/555_900", 200, "{\"permalink_url\":\"https://www.facebook.com/555/posts/900\"}");
    }

    private GraphApi graph() {
        return new GraphApi(transport(), server.baseUrl(), "v27.0");
    }

    private FacebookPublisher publisher() {
        return new FacebookPublisher(graph(), tokens(SocialNetwork.FACEBOOK, "555"), clock, new ObjectMapper());
    }
}
