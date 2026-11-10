package com.vinnot.notification.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AnnouncementTest {
    private final AnnouncementContent spanish = new AnnouncementContent("Vendimia", "Catas todo el mes.");
    private final AnnouncementContent english = new AnnouncementContent("Harvest", "Tastings all month.");
    private final AnnouncementAudience everyone = new AnnouncementAudience(true, true, null, null, null, null);

    @Test
    void eachRecipientReadsTheirLanguageOrTheOtherOneWhenItWasNotWritten() {
        Announcement both = new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.ES, spanish,
                NotificationLocale.EN, english), everyone, AnnouncementDestination.EVENTS);
        Announcement onlyEnglish = new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.EN, english), everyone,
                AnnouncementDestination.HOME);

        assertThat(both.versionFor(NotificationLocale.EN)).isEqualTo(Map.entry(NotificationLocale.EN, english));
        assertThat(both.versionFor(NotificationLocale.ES)).isEqualTo(Map.entry(NotificationLocale.ES, spanish));
        assertThat(onlyEnglish.versionFor(NotificationLocale.ES)).isEqualTo(Map.entry(NotificationLocale.EN, english));
        assertThat(both.headline()).isEqualTo("Vendimia");
        assertThat(onlyEnglish.headline()).isEqualTo("Harvest");
        assertThat(both.data(english)).isEqualTo(Map.of(NotificationType.SUBJECT, "Harvest",
                NotificationType.BODY, "Tastings all month.", NotificationType.ROUTE, "/events"));
    }

    @Test
    void anAnnouncementNeedsAVersionAChannelAndAKnownSegment() {
        assertThatThrownBy(() -> new Announcement(AnnouncementKind.SERVICE, Map.of(), everyone, AnnouncementDestination.HOME))
                .isInstanceOf(DomainException.class).hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_CONTENT_REQUIRED");
        assertThatThrownBy(() -> new AnnouncementAudience(false, false, null, null, null, null))
                .hasFieldOrPropertyWithValue("code", "ANNOUNCEMENT_CHANNEL_REQUIRED");
        assertThatThrownBy(() -> new AnnouncementAudience(true, false, "pt", null, null, null))
                .hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_AUDIENCE");
        assertThatThrownBy(() -> new AnnouncementAudience(true, false, null, null, null, "USER"))
                .hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_AUDIENCE");
        assertThat(new AnnouncementAudience(false, true, "en", UUID.randomUUID(), null, "PARTNER").role()).isEqualTo("PARTNER");
    }

    @Test
    void onlyTheTwoKindsAreAccepted() {
        assertThat(AnnouncementKind.parse("SERVICE")).isEqualTo(AnnouncementKind.SERVICE);
        assertThat(AnnouncementKind.parse("NEWS").promotional()).isTrue();
        assertThatThrownBy(() -> AnnouncementKind.parse("news")).hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_KIND");
        assertThatThrownBy(() -> AnnouncementKind.parse(null)).hasFieldOrPropertyWithValue("code", "INVALID_ANNOUNCEMENT_KIND");
    }
}
