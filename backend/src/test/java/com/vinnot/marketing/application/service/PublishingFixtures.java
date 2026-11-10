package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.PublishingSettings;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;

/** Approved and scheduled posts with rendered Spanish media, for the publishing tests (#510). */
final class PublishingFixtures {
    static final String IG_1 = "https://media.vinnot.com/posts/p/es/instagram-01.jpg";
    static final String IG_2 = "https://media.vinnot.com/posts/p/es/instagram-02.jpg";
    static final String TT_1 = "https://media.vinnot.com/posts/p/es/tiktok-01.jpg";
    static final UUID REVIEWER = UUID.randomUUID();
    /** Publishing on for every network, without per-network times. */
    static final PublishingSettings SETTINGS = new PublishingSettings(true, EnumSet.allOf(SocialNetwork.class), Duration.ofHours(6));

    private PublishingFixtures() { }

    /** An approved post on the Tuesday slot whose media is rendered (or still pending). */
    static SocialPost approved(boolean ready) {
        return approved(ready, TUESDAY_SLOT, IG_1, IG_2, TT_1);
    }

    static SocialPost approved(boolean ready, Instant slot, String instagram1, String instagram2, String tiktok1) {
        SocialPost post = MarketingFixtures.pending(slot, "CURIOUS_FACT", null);
        SocialPostMedia media = ready ? rendered(post.media(), instagram1, instagram2, tiktok1) : post.media();
        SocialPost restored = SocialPost.restore(post.id(), SocialPostStatus.PENDING_APPROVAL, slot, post.pillarCode(), null, post.copies(),
                post.generation(), null, media, NOW, NOW);
        restored.approve(REVIEWER, NOW);
        return restored;
    }

    /** A post whose publishing started at {@link MarketingFixtures#NOW}. */
    static SocialPost scheduled() {
        return scheduled(IG_1, IG_2, TT_1);
    }

    static SocialPost scheduled(String instagram1, String instagram2, String tiktok1) {
        SocialPost post = approved(true, TUESDAY_SLOT, instagram1, instagram2, tiktok1);
        post.startPublishing(NOW);
        return post;
    }

    static SocialPostMedia rendered(SocialPostMedia media, String instagram1, String instagram2, String tiktok1) {
        SocialPostMedia.SlideImages images = new SocialPostMedia.SlideImages(List.of(new SocialPostMedia.Image("posts/p/es/ig-1.jpg", instagram1),
                new SocialPostMedia.Image("posts/p/es/ig-2.jpg", instagram2)), List.of(new SocialPostMedia.Image("posts/p/es/tt-1.jpg", tiktok1)));
        return media.attempted(NOW).withIllustration(SocialPostMedia.Illustration.fallback(media.illustrationVersion(), "grapes",
                "AI_IMAGE_DISABLED"), NOW).rendered(Map.of(PostLanguage.ES, images, PostLanguage.EN, images), NOW);
    }
}
