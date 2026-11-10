package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.DraftCheck;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.social.SocialTestSupport.ManualClock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.NOW;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.TOKEN;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.failure;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.none;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.tokens;
import static com.vinnot.marketing.infrastructure.social.SocialTestSupport.transport;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * #516 S1: a TikTok inbox draft is checked once through {@code status/fetch}. {@code PUBLISH_COMPLETE} means the creator
 * posted it, linked to the public post when TikTok already gives its id; anything still in progress is pending; a failed
 * draft or an API error is a {@code SocialPublishingException} with the same codes as publishing.
 */
class TikTokDraftTrackerTest {

    private static final String STATUS = "/v2/post/publish/status/fetch/";
    private static final String CREATOR = "/v2/post/publish/creator_info/query/";
    private static final String OK = "\"error\":{\"code\":\"ok\",\"message\":\"\",\"log_id\":\"l1\"}";
    private final FakeNetworkServer server = FakeNetworkServer.start();
    private final ManualClock clock = new ManualClock();
    private final ObjectMapper json = new ObjectMapper();

    @AfterEach
    void close() {
        server.close();
    }

    @Test
    void aPostedDraftWithAPublicPostIdLinksTheCreatorsPost() {
        server.on("POST", STATUS, 200, "{\"data\":{\"status\":\"PUBLISH_COMPLETE\","
                + "\"publicaly_available_post_id\":[7311]}," + OK + "}");
        server.on("POST", CREATOR, 200, "{\"data\":{\"creator_username\":\"vinnot\",\"privacy_level_options\":"
                + "[\"PUBLIC_TO_EVERYONE\"]}," + OK + "}");

        DraftCheck check = tracker().check("p_inbox.1");

        assertThat(check).isEqualTo(DraftCheck.posted("https://www.tiktok.com/@vinnot/photo/7311"));
        var fetch = server.only("POST", STATUS);
        assertThat(fetch.authorization()).isEqualTo("Bearer " + TOKEN);
        assertThat(json.readTree(fetch.body()).path("publish_id").asText()).isEqualTo("p_inbox.1");
        assertThat(server.only("POST", CREATOR).authorization()).isEqualTo("Bearer " + TOKEN);
        assertThat(tracker().network()).isEqualTo(SocialNetwork.TIKTOK);
    }

    @Test
    void aPostedDraftWithoutAPublicPostIdIsPostedWithoutALinkAndWithoutAskingForTheCreator() {
        server.on("POST", STATUS, 200, "{\"data\":{\"status\":\"PUBLISH_COMPLETE\",\"publicaly_available_post_id\":[]}," + OK + "}");

        assertThat(tracker().check("p1")).isEqualTo(DraftCheck.posted(null));
        assertThat(server.all("POST", CREATOR)).isEmpty();
    }

    @Test
    void aCreatorWithoutAUsernameLeavesThePostWithoutALink() {
        server.on("POST", STATUS, 200, "{\"data\":{\"status\":\"PUBLISH_COMPLETE\","
                + "\"publicaly_available_post_id\":[\"7311\"]}," + OK + "}");
        server.on("POST", CREATOR, 200, "{\"data\":{}," + OK + "}");

        assertThat(tracker().check("p1")).isEqualTo(DraftCheck.posted(null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SEND_TO_USER_INBOX", "PROCESSING_DOWNLOAD", "PROCESSING_UPLOAD", "SOMETHING_NEW", ""})
    void aDraftNotPostedYetIsPending(String status) {
        server.on("POST", STATUS, 200, "{\"data\":{\"status\":\"" + status + "\"}," + OK + "}");

        assertThat(tracker().check("p1")).isEqualTo(DraftCheck.pending());
        assertThat(server.all("POST", CREATOR)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
        "picture_size_check_failed, MEDIA_REJECTED",
        "internal, UNAVAILABLE",
        "auth_removed, TOKEN_INVALID",
        "spam_risk_too_many_posts, RATE_LIMITED"
    })
    void aFailedDraftIsMappedFromItsFailReason(String reason, Code expected) {
        server.on("POST", STATUS, 200, "{\"data\":{\"status\":\"FAILED\",\"fail_reason\":\"" + reason + "\"}," + OK + "}");

        var failure = failure(() -> tracker().check("p1"));

        assertThat(failure.code()).isEqualTo(expected);
        assertThat(failure.detail()).contains(reason);
    }

    @ParameterizedTest
    @CsvSource({
        "400, invalid_publish_id, REJECTED",
        "429, rate_limit_exceeded, RATE_LIMITED",
        "401, access_token_invalid, TOKEN_INVALID",
        "500, internal_error, UNAVAILABLE"
    })
    void anApiErrorIsMappedToACode(int status, String error, Code expected) {
        server.on("POST", STATUS, status, "{\"data\":{},\"error\":{\"code\":\"" + error
                + "\",\"message\":\"Refused\",\"log_id\":\"l1\"}}");

        assertThat(failure(() -> tracker().check("p1")).code()).isEqualTo(expected);
    }

    @Test
    void withoutAnAccountOrWithAnExpiredTokenNothingIsCalled() {
        var disconnected = new TikTokDraftTracker(api(), none(), clock);
        var expired = new TikTokDraftTracker(api(), tokens(Map.of(SocialNetwork.TIKTOK,
                new SocialAccessToken(TOKEN, "open-1", NOW))), clock);

        assertThat(failure(() -> disconnected.check("p1")).code()).isEqualTo(Code.NOT_CONNECTED);
        assertThat(failure(() -> expired.check("p1")).code()).isEqualTo(Code.TOKEN_INVALID);
        assertThat(server.requests()).isEmpty();
    }

    private TikTokApi api() {
        return new TikTokApi(transport(), server.baseUrl());
    }

    private TikTokDraftTracker tracker() {
        return new TikTokDraftTracker(api(), tokens(SocialNetwork.TIKTOK, "open-1"), clock);
    }
}
