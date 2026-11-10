package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.PublishResult.Outcome;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Collections;
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

class TikTokPublisherTest {

    private static final String INIT = "/v2/post/publish/content/init/";
    private static final String STATUS = "/v2/post/publish/status/fetch/";
    private static final String CREATOR = "/v2/post/publish/creator_info/query/";
    private static final NetworkCaption CAPTION = new NetworkCaption("Malbec, explained.", "Why Malbec?",
            List.of("vino", "#malbec"), null);
    private static final String OK = "\"error\":{\"code\":\"ok\",\"message\":\"\",\"log_id\":\"l1\"}";
    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final ManualClock clock = new ManualClock();
    private final ObjectMapper json = new ObjectMapper();

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void mediaUploadSendsTheCarouselToTheInboxAsADraft() {
        server.on("POST", INIT, 200, "{\"data\":{\"publish_id\":\"p_inbox.1\"}," + OK + "}");
        server.on("POST", STATUS, 200, status("PROCESSING_DOWNLOAD", ""));
        server.on("POST", STATUS, 200, status("SEND_TO_USER_INBOX", ""));

        var result = publisher(TikTokPostMode.MEDIA_UPLOAD).publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION));

        assertThat(result.outcome()).isEqualTo(Outcome.DRAFT_SENT);
        assertThat(result.externalId()).isEqualTo("p_inbox.1");
        assertThat(result.permalink()).isNull();
        assertThat(publisher(TikTokPostMode.MEDIA_UPLOAD).network()).isEqualTo(SocialNetwork.TIKTOK);
        assertThat(server.all("POST", CREATOR)).isEmpty();
        var init = server.only("POST", INIT);
        assertThat(init.authorization()).isEqualTo("Bearer " + TOKEN);
        assertThat(init.contentType()).startsWith("application/json");
        assertThat(init.body()).doesNotContain(TOKEN);
        JsonNode body = json.readTree(init.body());
        assertThat(body.path("media_type").asText()).isEqualTo("PHOTO");
        assertThat(body.path("post_mode").asText()).isEqualTo("MEDIA_UPLOAD");
        assertThat(body.path("source_info").path("source").asText()).isEqualTo("PULL_FROM_URL");
        assertThat(body.path("source_info").path("photo_cover_index").asInt(-1)).isZero();
        assertThat(body.path("source_info").path("photo_images").get(1).asText()).isEqualTo(IMAGES.get(1));
        assertThat(body.path("post_info").path("title").asText()).isEqualTo("Why Malbec?");
        assertThat(body.path("post_info").path("description").asText())
                .isEqualTo("Malbec, explained.\n\n#vino #malbec");
        assertThat(body.path("post_info").has("privacy_level")).isFalse();
        assertThat(server.all("POST", STATUS)).hasSize(2).allSatisfy(fetch ->
                assertThat(json.readTree(fetch.body()).path("publish_id").asText()).isEqualTo("p_inbox.1"));
        assertThat(clock.sleeps()).isEqualTo(1);
    }

    @Test
    void directPostPublishesPubliclyAndLinksTheModeratedPost() {
        server.on("POST", CREATOR, 200, "{\"data\":{\"creator_username\":\"vinnot\",\"privacy_level_options\":"
                + "[\"MUTUAL_FOLLOW_FRIENDS\",\"PUBLIC_TO_EVERYONE\",\"SELF_ONLY\"]}," + OK + "}");
        server.on("POST", INIT, 200, "{\"data\":{\"publish_id\":\"p1\"}," + OK + "}");
        server.on("POST", STATUS, 200, "{\"data\":{\"status\":\"PUBLISH_COMPLETE\","
                + "\"publicaly_available_post_id\":[7311]}," + OK + "}");

        var result = publisher(TikTokPostMode.DIRECT_POST).publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION));

        assertThat(result.outcome()).isEqualTo(Outcome.PUBLISHED);
        assertThat(result.externalId()).isEqualTo("p1");
        assertThat(result.permalink()).isEqualTo("https://www.tiktok.com/@vinnot/photo/7311");
        assertThat(server.only("POST", CREATOR).authorization()).isEqualTo("Bearer " + TOKEN);
        JsonNode body = json.readTree(server.only("POST", INIT).body());
        assertThat(body.path("post_mode").asText()).isEqualTo("DIRECT_POST");
        assertThat(body.path("post_info").path("privacy_level").asText()).isEqualTo("PUBLIC_TO_EVERYONE");
        assertThat(body.path("post_info").path("disable_comment").asBoolean(true)).isFalse();
        assertThat(body.path("post_info").path("auto_add_music").asBoolean(false)).isTrue();
    }

    @Test
    void directPostWithoutAPublicOptionTakesTheFirstAndAnUnmoderatedPostHasNoLink() {
        server.on("POST", CREATOR, 200, "{\"data\":{\"privacy_level_options\":"
                + "[\"FOLLOWER_OF_CREATOR\",\"SELF_ONLY\"]}," + OK + "}");
        server.on("POST", INIT, 200, "{\"data\":{\"publish_id\":\"p1\"}," + OK + "}");
        server.on("POST", STATUS, 200, status("PUBLISH_COMPLETE", ""));

        var result = publisher(TikTokPostMode.DIRECT_POST).publish(request(SocialNetwork.TIKTOK, IMAGES,
                new NetworkCaption("Only text", null, List.of(), null)));

        assertThat(result.permalink()).isNull();
        JsonNode postInfo = json.readTree(server.only("POST", INIT).body()).path("post_info");
        assertThat(postInfo.path("privacy_level").asText()).isEqualTo("FOLLOWER_OF_CREATOR");
        assertThat(postInfo.has("title")).isFalse();
        assertThat(postInfo.path("description").asText()).isEqualTo("Only text");
    }

    @Test
    void directPostWithoutAnyPrivacyOptionIsRejected() {
        server.on("POST", CREATOR, 200, "{\"data\":{\"privacy_level_options\":[]}," + OK + "}");

        assertThat(failure(() -> publisher(TikTokPostMode.DIRECT_POST)
                .publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION))).code()).isEqualTo(Code.REJECTED);
        assertThat(server.all("POST", INIT)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
        "403, url_ownership_unverified, MEDIA_NOT_PUBLIC",
        "403, spam_risk_too_many_posts, RATE_LIMITED",
        "403, spam_risk_too_many_pending_share, RATE_LIMITED",
        "403, reached_active_user_cap, RATE_LIMITED",
        "429, rate_limit_exceeded, RATE_LIMITED",
        "403, unaudited_client_can_only_post_to_private_accounts, REJECTED",
        "403, privacy_level_option_mismatch, REJECTED",
        "403, spam_risk_user_banned_from_posting, REJECTED",
        "401, access_token_invalid, TOKEN_INVALID",
        "401, scope_not_authorized, TOKEN_INVALID",
        "400, invalid_param, REJECTED",
        "500, internal_error, UNAVAILABLE",
        "200, spam_risk_too_many_posts, RATE_LIMITED",
        "200, something_new, REJECTED"
    })
    void mapsTheInitErrorToACode(int status, String error, Code expected) {
        server.on("POST", INIT, status, "{\"data\":{},\"error\":{\"code\":\"" + error
                + "\",\"message\":\"Refused\",\"log_id\":\"l1\"}}");

        var failure = failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD)
                .publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(expected);
        assertThat(failure.detail()).contains(error);
        assertThat(server.all("POST", STATUS)).isEmpty();
    }

    @Test
    void anErrorWithoutABodyIsMappedByStatus() {
        server.on("POST", INIT, 502, "");

        assertThat(failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD)
                .publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION))).code()).isEqualTo(Code.UNAVAILABLE);
    }

    @Test
    void anInitWithoutAPublishIdIsRejected() {
        server.on("POST", INIT, 200, "{\"data\":{}," + OK + "}");

        assertThat(failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD)
                .publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION))).code()).isEqualTo(Code.REJECTED);
    }

    @ParameterizedTest
    @CsvSource({
        "picture_size_check_failed, MEDIA_REJECTED",
        "photo_pull_failed, MEDIA_REJECTED",
        "spam_risk_text, MEDIA_REJECTED",
        "internal, UNAVAILABLE",
        "auth_removed, TOKEN_INVALID",
        "spam_risk_too_many_posts, RATE_LIMITED",
        "url_ownership_unverified, MEDIA_NOT_PUBLIC"
    })
    void aFailedPublishIsMappedFromItsFailReason(String reason, Code expected) {
        server.on("POST", INIT, 200, "{\"data\":{\"publish_id\":\"p1\"}," + OK + "}");
        server.on("POST", STATUS, 200, status("FAILED", reason));

        var failure = failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD)
                .publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION)));

        assertThat(failure.code()).isEqualTo(expected);
        assertThat(failure.detail()).contains(reason);
    }

    @Test
    void aPublishStillDownloadingAtTheDeadlineTimesOut() {
        server.on("POST", INIT, 200, "{\"data\":{\"publish_id\":\"p1\"}," + OK + "}");
        server.on("POST", STATUS, 200, status("PROCESSING_DOWNLOAD", ""));

        assertThat(failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD)
                .publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION))).code()).isEqualTo(Code.PROCESSING_TIMEOUT);
        assertThat(clock.instant()).isEqualTo(NOW.plus(Duration.ofMinutes(5)));
    }

    @Test
    void withoutAnAccountItIsNotConnectedAndTheImageCountIsChecked() {
        var disconnected = new TikTokPublisher(api(), none(), poller(clock, Duration.ofSeconds(15),
                Duration.ofMinutes(5)), clock, TikTokPostMode.MEDIA_UPLOAD);

        assertThat(failure(() -> disconnected.publish(request(SocialNetwork.TIKTOK, IMAGES, CAPTION))).code())
                .isEqualTo(Code.NOT_CONNECTED);
        assertThat(failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD).publish(request(SocialNetwork.TIKTOK,
                List.of(), CAPTION))).code()).isEqualTo(Code.REJECTED);
        assertThat(failure(() -> publisher(TikTokPostMode.MEDIA_UPLOAD).publish(request(SocialNetwork.TIKTOK,
                Collections.nCopies(36, IMAGES.getFirst()), CAPTION))).code()).isEqualTo(Code.REJECTED);
        assertThat(server.requests()).isEmpty();
    }

    private static String status(String status, String failReason) {
        return "{\"data\":{\"status\":\"" + status + "\",\"fail_reason\":\"" + failReason + "\"}," + OK + "}";
    }

    private TikTokApi api() {
        return new TikTokApi(transport(), server.baseUrl());
    }

    private TikTokPublisher publisher(TikTokPostMode mode) {
        return new TikTokPublisher(api(), tokens(SocialNetwork.TIKTOK, "open-1"),
                poller(clock, Duration.ofSeconds(15), Duration.ofMinutes(5)), clock, mode);
    }
}
