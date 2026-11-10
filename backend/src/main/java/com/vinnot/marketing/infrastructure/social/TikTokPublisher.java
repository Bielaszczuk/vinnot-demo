package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.PublishRequest;
import com.vinnot.marketing.application.model.PublishResult;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.application.port.out.SocialPublisher;
import com.vinnot.marketing.domain.model.SocialNetwork;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Posts a photo carousel through the TikTok Content Posting API (#510, S1). In {@link TikTokPostMode#MEDIA_UPLOAD} (the
 * default) TikTok pulls the images from their public URLs and sends a draft to the creator's inbox, a
 * {@code DRAFT_SENT} outcome; in {@link TikTokPostMode#DIRECT_POST} it publishes with the creator's most open privacy
 * option. The external id is TikTok's {@code publish_id}. Stateless.
 */
public final class TikTokPublisher implements SocialPublisher {

    static final String CREATOR_INFO = "/v2/post/publish/creator_info/query/";
    static final String INIT = "/v2/post/publish/content/init/";
    static final String STATUS = "/v2/post/publish/status/fetch/";
    static final int MIN_IMAGES = 1;
    static final int MAX_IMAGES = 35;
    private static final String PUBLIC = "PUBLIC_TO_EVERYONE";

    private record Creator(String username, String privacyLevel) {
    }

    private final TikTokApi api;
    private final SocialAccountTokens tokens;
    private final StatusPoller poller;
    private final Clock clock;
    private final TikTokPostMode mode;

    TikTokPublisher(TikTokApi api, SocialAccountTokens tokens, StatusPoller poller, Clock clock, TikTokPostMode mode) {
        this.api = api;
        this.tokens = tokens;
        this.poller = poller;
        this.clock = clock;
        this.mode = mode;
    }

    @Override
    public SocialNetwork network() {
        return SocialNetwork.TIKTOK;
    }

    @Override
    public PublishResult publish(PublishRequest request) {
        SocialAccessToken token = SocialAdapters.token(tokens, SocialNetwork.TIKTOK, clock);
        SocialAdapters.requireImages(request.imageUrls(), MIN_IMAGES, MAX_IMAGES, SocialNetwork.TIKTOK);
        Map<String, Object> postInfo = new LinkedHashMap<>();
        String title = request.caption().title();
        if (Objects.nonNull(title) && !title.isBlank()) {
            postInfo.put("title", title);
        }
        postInfo.put("description", SocialAdapters.withHashtags(request.caption()));
        Creator creator = null;
        if (mode == TikTokPostMode.DIRECT_POST) {
            creator = creator(token.accessToken());
            postInfo.put("privacy_level", creator.privacyLevel());
            postInfo.put("disable_comment", false);
            postInfo.put("auto_add_music", true);
        }
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("source", "PULL_FROM_URL");
        source.put("photo_cover_index", 0);
        source.put("photo_images", request.imageUrls());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("media_type", "PHOTO");
        body.put("post_mode", mode.name());
        body.put("post_info", postInfo);
        body.put("source_info", source);
        String publishId = SocialAdapters.requiredId(api.post(INIT, body, token.accessToken()), "publish_id", "init");
        JsonNode done = poller.await(() -> status(publishId, token.accessToken()), "TikTok post");
        if ("SEND_TO_USER_INBOX".equals(done.path("status").asText())) {
            return new PublishResult(PublishResult.Outcome.DRAFT_SENT, publishId, null);
        }
        return new PublishResult(PublishResult.Outcome.PUBLISHED, publishId, permalink(creator, done));
    }

    private Creator creator(String token) {
        JsonNode info = api.post(CREATOR_INFO, null, token);
        List<String> options = new ArrayList<>();
        info.path("privacy_level_options").forEach(option -> options.add(option.asText("")));
        options.removeIf(String::isBlank);
        if (options.isEmpty()) {
            throw new SocialPublishingException(Code.REJECTED, "TikTok offers no privacy level for this creator");
        }
        String privacy = options.contains(PUBLIC) ? PUBLIC : options.getFirst();
        return new Creator(info.path("creator_username").asText(""), privacy);
    }

    private Optional<JsonNode> status(String publishId, String token) {
        JsonNode data = api.post(STATUS, Map.of("publish_id", publishId), token);
        String status = data.path("status").asText("");
        return switch (status) {
            case "SEND_TO_USER_INBOX", "PUBLISH_COMPLETE" -> Optional.of(data);
            case "FAILED" -> {
                String reason = data.path("fail_reason").asText("");
                throw new SocialPublishingException(TikTokApi.failReason(reason), "TikTok post failed: " + reason);
            }
            default -> Optional.empty();
        };
    }

    /** Known only for a public post TikTok already moderated, in direct-post mode where the creator's name is known. */
    private static String permalink(Creator creator, JsonNode done) {
        return Objects.isNull(creator) ? null : permalink(creator.username(), publicPostId(done));
    }

    /** The public post's id from a {@code status/fetch} answer (TikTok's spelling); empty until TikTok moderated a public post. */
    static String publicPostId(JsonNode status) {
        return status.path("publicaly_available_post_id").path(0).asText("");
    }

    /** The public photo post's link; null when the creator's name or the post id is unknown. */
    static String permalink(String username, String postId) {
        if (Objects.isNull(username) || username.isBlank() || Objects.isNull(postId) || postId.isBlank()) {
            return null;
        }
        return "https://www.tiktok.com/@" + username + "/photo/" + postId;
    }
}
