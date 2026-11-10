package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.infrastructure.effects.OutboxSocialMediaRenderQueue;
import com.vinnot.shared.infrastructure.storage.SocialMediaReferences;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tells storage cleanup whether a rendered image is still in use (#492): a post's media references it (hero or any
 * slide of any language, #497), or a render of the post the key belongs to is still queued or running and may be about to reference it again.
 * A deferred deletion is safe: every stored image also has its own later orphan check.
 */
@Component
public class JdbcSocialMediaReferences implements SocialMediaReferences {
    private static final Pattern POST_KEY = Pattern.compile("posts/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.*");
    private static final String REFERENCED = """
            SELECT EXISTS(SELECT 1 FROM social_posts WHERE media -> 'illustration' -> 'image' ->> 'key' = ?
                OR jsonb_path_exists(media, '$.slides.*.instagram[*] ? (@.key == $key)', jsonb_build_object('key', CAST(? AS text)))
                OR jsonb_path_exists(media, '$.slides.*.tiktok[*] ? (@.key == $key)', jsonb_build_object('key', CAST(? AS text))))
            OR EXISTS(SELECT 1 FROM external_effects WHERE kind = ? AND payload ->> 'postId' = ?)
            """;
    private final JdbcTemplate jdbc;

    public JdbcSocialMediaReferences(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean isReferenced(String key) {
        Matcher post = POST_KEY.matcher(Objects.requireNonNullElse(key, ""));
        String postId = post.matches() ? post.group(1) : null;
        return Boolean.TRUE.equals(jdbc.queryForObject(REFERENCED, Boolean.class, key, key, key, OutboxSocialMediaRenderQueue.KIND, postId));
    }
}
