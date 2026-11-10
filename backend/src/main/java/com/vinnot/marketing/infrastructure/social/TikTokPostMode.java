package com.vinnot.marketing.infrastructure.social;

import java.util.Locale;

/**
 * How TikTok takes a post (#510, S1/S9): {@link #MEDIA_UPLOAD} sends it to the creator's inbox as a draft they post with
 * one tap; {@link #DIRECT_POST} publishes it, which TikTok only allows publicly once the app passed its audit.
 */
public enum TikTokPostMode {
    MEDIA_UPLOAD,
    DIRECT_POST;

    static TikTokPostMode parse(String value) {
        try {
            return valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("app.marketing.publishing.tiktok.mode must be MEDIA_UPLOAD or DIRECT_POST",
                    invalid);
        }
    }
}
