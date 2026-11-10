package com.vinnot.notification.infrastructure.security;

import com.vinnot.notification.application.port.out.UnsubscribeLinkPort.UnsubscribeTarget;
import com.vinnot.notification.domain.model.NotificationCategory;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SealedUnsubscribeLinksTest {
    private final SealedUnsubscribeLinks links =
            new SealedUnsubscribeLinks("test-secret", "https://vinnot.test/", "https://api.vinnot.test/api/");

    @Test
    void issuesAPageLinkAndAOneClickLinkForTheSameOpaqueToken() {
        UUID user = UUID.randomUUID();
        var link = links.issue(user, NotificationCategory.NEWSLETTER);

        String token = link.pageUrl().substring("https://vinnot.test/unsubscribe?token=".length());
        assertThat(link.pageUrl()).startsWith("https://vinnot.test/unsubscribe?token=");
        assertThat(link.oneClickUrl()).isEqualTo("https://api.vinnot.test/api/notifications/unsubscribe?token=" + token);
        assertThat(token).doesNotContain(user.toString()).matches("[A-Za-z0-9_-]+");
        assertThat(links.verify(token)).contains(new UnsubscribeTarget(user, NotificationCategory.NEWSLETTER));
    }

    @Test
    void rejectsAlteredForeignAndMalformedTokens() {
        String token = links.issue(UUID.randomUUID(), NotificationCategory.RECOMMENDATIONS).pageUrl().split("token=")[1];
        // The first character carries only significant bits; the last one of unpadded base64 may not.
        char first = token.charAt(0);
        String altered = (first == 'A' ? 'B' : 'A') + token.substring(1);
        var otherKey = new SealedUnsubscribeLinks("other-secret", "https://vinnot.test", "https://api.vinnot.test/api");

        assertThat(links.verify(altered)).isEmpty();
        assertThat(otherKey.verify(token)).isEmpty();
        assertThat(links.verify(null)).isEmpty();
        assertThat(links.verify("")).isEmpty();
        assertThat(links.verify("not base64 !")).isEmpty();
        assertThat(links.verify("AAAA")).isEmpty();
        assertThat(links.verify("A".repeat(300))).isEmpty();
    }
}
