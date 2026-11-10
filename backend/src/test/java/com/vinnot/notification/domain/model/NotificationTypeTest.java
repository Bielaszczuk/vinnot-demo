package com.vinnot.notification.domain.model;

import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationTypeTest {
    @Test
    void onlyAnnouncementsKeepTheLanguageTheyWereWrittenIn() {
        assertThat(Arrays.stream(NotificationType.values()).filter(NotificationType::keepsRequestLocale))
                .containsExactlyInAnyOrder(NotificationType.NEWSLETTER, NotificationType.SERVICE_NOTICE,
                        NotificationType.ANNOUNCEMENT_TEST);
    }
}
