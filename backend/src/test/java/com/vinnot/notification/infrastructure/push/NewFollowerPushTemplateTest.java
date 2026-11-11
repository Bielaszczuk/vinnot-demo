package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** #541 S7: a community push, never an email, naming the new follower and opening their public profile. */
class NewFollowerPushTemplateTest {
    private static final String FOLLOWER = "11111111-2222-3333-4444-555555555555";
    private final NewFollowerPushTemplate template = new NewFollowerPushTemplate();

    @Test
    void namesTheFollowerInBothLanguagesAndOpensTheirProfile() {
        Map<String, String> data = Map.of("followerId", FOLLOWER, "follower", "Lucía Pérez");
        assertThat(template.render(NotificationLocale.ES, data)).isEqualTo(new PushContent("Nuevo seguidor",
                "Lucía Pérez empezó a seguirte.", "/users/" + FOLLOWER));
        assertThat(template.render(NotificationLocale.EN, data)).isEqualTo(new PushContent("New follower",
                "Lucía Pérez started following you.", "/users/" + FOLLOWER));
    }

    @Test
    void isACommunityPushThatNeverEmails() {
        assertThat(template.type()).isEqualTo(NotificationType.NEW_FOLLOWER);
        assertThat(NotificationType.NEW_FOLLOWER.category()).isEqualTo(NotificationCategory.COMMUNITY);
        assertThat(NotificationType.NEW_FOLLOWER.emails()).isFalse();
        assertThat(NotificationType.NEW_FOLLOWER.engagement()).isFalse();
    }
}
