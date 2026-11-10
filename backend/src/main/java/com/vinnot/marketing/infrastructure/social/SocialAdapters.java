package com.vinnot.marketing.infrastructure.social;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.NetworkCaption;
import com.vinnot.marketing.application.model.SocialAccessToken;
import com.vinnot.marketing.application.port.out.SocialAccountTokens;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/** What every network adapter does the same way (#510): the account's token, image counts, captions and ids. */
final class SocialAdapters {

    private static final Logger LOG = LoggerFactory.getLogger(SocialAdapters.class);

    private SocialAdapters() {
    }

    /** The network's token: {@code NOT_CONNECTED} without one, {@code TOKEN_INVALID} once it expired. */
    static SocialAccessToken token(SocialAccountTokens tokens, SocialNetwork network, Clock clock) {
        SocialAccessToken token = tokens.tokenFor(network)
                .filter(found -> !found.accessToken().isBlank() && !found.accountId().isBlank())
                .orElseThrow(() -> new SocialPublishingException(Code.NOT_CONNECTED, network + " is not connected"));
        if (Objects.nonNull(token.expiresAt()) && !token.expiresAt().isAfter(clock.instant())) {
            throw new SocialPublishingException(Code.TOKEN_INVALID, network + " token expired");
        }
        return token;
    }

    /** Refuses, before any call, a carousel the network would not take. */
    static void requireImages(List<String> images, int min, int max, SocialNetwork network) {
        if (images.size() < min || images.size() > max) {
            throw new SocialPublishingException(Code.REJECTED,
                    network + " takes " + min + " to " + max + " images, got " + images.size());
        }
    }

    /** The caption followed by a blank line and its hashtags, each with one leading {@code #}. */
    static String withHashtags(NetworkCaption caption) {
        String hashtags = caption.hashtags().stream().map(SocialAdapters::bareTag).filter(tag -> !tag.isEmpty())
                .map(tag -> "#" + tag).collect(Collectors.joining(" "));
        return hashtags.isEmpty() ? caption.text() : caption.text().strip() + "\n\n" + hashtags;
    }

    /** A tag without its leading {@code #} and surrounding spaces. */
    static String bareTag(String tag) {
        String stripped = Objects.requireNonNullElse(tag, "").strip();
        while (stripped.startsWith("#")) {
            stripped = stripped.substring(1).strip();
        }
        return stripped;
    }

    /** The {@code id} of a created object; an answer without one is a refusal. */
    static String requiredId(JsonNode answer, String field, String what) {
        String id = answer.path(field).asText("");
        if (id.isBlank()) {
            throw new SocialPublishingException(Code.REJECTED, "no " + field + " in the " + what + " answer");
        }
        return id;
    }

    /**
     * Best effort: the post is already live, so a failed lookup only leaves its link unknown and never fails (or
     * retries, which would publish it twice) the publication.
     */
    static String permalink(GraphApi graph, String id, String field, String token, SocialNetwork network) {
        try {
            String permalink = graph.get(id, null, Map.of("fields", field), token).path(field).asText("");
            return permalink.isBlank() ? null : permalink;
        } catch (SocialPublishingException unknown) {
            LOG.warn("{} post {} published but its permalink is unknown: {}", network, id, unknown.code());
            return null;
        }
    }
}
