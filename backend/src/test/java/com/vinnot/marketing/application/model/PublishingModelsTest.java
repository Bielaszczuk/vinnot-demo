package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510: what the publishing ports carry. */
class PublishingModelsTest {

    @Test
    void aPublishRequestKeepsItsImagesInOrderAndCannotBeChangedAfterwards() {
        List<String> urls = new ArrayList<>(List.of("https://cdn.vinnot.app/1.jpg", "https://cdn.vinnot.app/2.jpg"));
        PublishRequest request = new PublishRequest(UUID.randomUUID(), SocialNetwork.INSTAGRAM, urls, "Copa de vino",
                new NetworkCaption("Hoy es el día del Merlot.", null, List.of("#vinnot"), null));
        urls.clear();

        assertThat(request.imageUrls()).containsExactly("https://cdn.vinnot.app/1.jpg", "https://cdn.vinnot.app/2.jpg");
        assertThatThrownBy(() -> new PublishRequest(UUID.randomUUID(), null, List.of(), null, request.caption()))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new PublishRequest(UUID.randomUUID(), SocialNetwork.TIKTOK, List.of(), null, null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void aCaptionWithoutHashtagsHasNone() {
        NetworkCaption threads = new NetworkCaption("Merlot, el tinto amable", null, null, "Vino");

        assertThat(threads.hashtags()).isEmpty();
        assertThat(threads.topicTag()).isEqualTo("Vino");
        assertThat(new NetworkCaption("t", "Merlot", List.of("#a"), null).title()).isEqualTo("Merlot");
        assertThatThrownBy(() -> new NetworkCaption(null, null, List.of(), null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aResultNeedsItsOutcomeAndNetworkId() {
        PublishResult draft = new PublishResult(PublishResult.Outcome.DRAFT_SENT, "v_inbox_1", null);

        assertThat(draft.outcome()).isEqualTo(PublishResult.Outcome.DRAFT_SENT);
        assertThat(draft.permalink()).isNull();
        assertThatThrownBy(() -> new PublishResult(PublishResult.Outcome.PUBLISHED, null, null)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new PublishResult(null, "1", null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aDraftCheckIsPostedWithAnOptionalLinkOrStillPending() {
        DraftCheck posted = DraftCheck.posted("https://www.tiktok.com/@vinnot/photo/7311");
        DraftCheck unlinked = DraftCheck.posted(null);
        DraftCheck pending = DraftCheck.pending();

        assertThat(posted.state()).isEqualTo(DraftCheck.State.POSTED);
        assertThat(posted.permalink()).isEqualTo("https://www.tiktok.com/@vinnot/photo/7311");
        assertThat(unlinked.state()).isEqualTo(DraftCheck.State.POSTED);
        assertThat(unlinked.permalink()).isNull();
        assertThat(pending.state()).isEqualTo(DraftCheck.State.PENDING);
        assertThat(pending.permalink()).isNull();
        assertThatThrownBy(() -> new DraftCheck(null, null)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new DraftCheck(DraftCheck.State.PENDING, "https://www.tiktok.com/@vinnot/photo/1"))
                .as("a draft still in the inbox has no public link").isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void anAccessTokenNeverShowsItsTokenInItsTextForm() {
        Instant expiry = Instant.parse("2027-01-01T00:00:00Z");
        SocialAccessToken token = new SocialAccessToken("secret-token-value", "1789", expiry);

        assertThat(token.toString()).doesNotContain("secret-token-value").contains("1789").contains(expiry.toString());
        assertThat(new SocialAccessToken("t", "page-1", null).expiresAt()).as("a token that does not expire").isNull();
        assertThatThrownBy(() -> new SocialAccessToken(null, "1", null)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new SocialAccessToken("t", null, null)).isInstanceOf(NullPointerException.class);
    }
}
