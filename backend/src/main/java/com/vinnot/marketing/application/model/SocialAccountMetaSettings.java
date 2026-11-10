package com.vinnot.marketing.application.model;

import java.util.Objects;

/**
 * What the admin page may know about the Meta secrets (#510 S5): the configured ids and whether a token is set, never the
 * token itself. Instagram needs the token and the Instagram user id; the Facebook Page needs the Page id and a token.
 */
public record SocialAccountMetaSettings(String instagramUserId, String pageId, boolean tokenConfigured) {

    public boolean instagramConfigured() {
        return tokenConfigured && present(instagramUserId);
    }

    public boolean facebookConfigured() {
        return tokenConfigured && present(pageId);
    }

    private static boolean present(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }
}
