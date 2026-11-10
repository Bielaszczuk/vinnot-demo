package com.vinnot.notification.domain.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AnnouncementRefTest {
    private final UUID announcement = UUID.fromString("5f0c4d1e-8a2b-4c3d-9e4f-0a1b2c3d4e5f");
    private final UUID user = UUID.fromString("0e1d2c3b-4a59-4687-a5b4-c3d2e1f0a9b8");

    @Test
    void theKeysOfAnAnnouncementKeepTheirFormatAndNameTheirAnnouncement() {
        String send = "announcement:" + announcement + ":";
        assertThat(AnnouncementRef.email(announcement, user)).isEqualTo(send + user);
        assertThat(AnnouncementRef.push(announcement, NotificationLocale.EN, user)).isEqualTo(send + "en:" + user);
        assertThat(AnnouncementRef.test(announcement, NotificationLocale.ES))
                .isEqualTo("announcement-test:" + announcement + ":es");
        AnnouncementRef sent = new AnnouncementRef(announcement, send);
        assertThat(AnnouncementRef.of(AnnouncementRef.email(announcement, user))).contains(sent);
        assertThat(AnnouncementRef.of(AnnouncementRef.push(announcement, NotificationLocale.ES, user) + ":1")).contains(sent);
        assertThat(AnnouncementRef.of(AnnouncementRef.push(announcement, NotificationLocale.ES, user) + ":quiet:1761000000"))
                .contains(sent);
        assertThat(AnnouncementRef.of(AnnouncementRef.test(announcement, NotificationLocale.EN)))
                .contains(new AnnouncementRef(announcement, "announcement-test:" + announcement + ":"));
    }

    @Test
    void keysOfOtherMessagesOrWithoutACanonicalIdNameNoAnnouncement() {
        assertThat(AnnouncementRef.of(null)).isEmpty();
        assertThat(AnnouncementRef.of("wine-recommendation:1")).isEmpty();
        assertThat(AnnouncementRef.of("announcement-preview")).isEmpty();
        assertThat(AnnouncementRef.of("announcement:" + announcement)).isEmpty();
        assertThat(AnnouncementRef.of("announcement:" + announcement + "x")).isEmpty();
        assertThat(AnnouncementRef.of("announcement:not-a-uuid-at-all-but-thirty-six-chars:x")).isEmpty();
        assertThat(AnnouncementRef.of("announcement:" + announcement.toString().toUpperCase() + ":x")).isEmpty();
        assertThat(AnnouncementRef.of("announcement:1-1-1-1-1" + "0".repeat(27) + ":x")).isEmpty();
        assertThat(AnnouncementRef.TYPES).containsExactlyInAnyOrder(NotificationType.NEWSLETTER,
                NotificationType.SERVICE_NOTICE, NotificationType.ANNOUNCEMENT_TEST);
    }
}
