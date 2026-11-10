package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** S6: "Reached <tier>" in both languages, governed by the community preference, push only. */
class TierReachedPushTemplateTest {
    private final TierReachedPushTemplate template = new TierReachedPushTemplate();

    @Test
    void namesTheTierInBothLanguagesAndOpensTheProfile() {
        assertThat(template.render(NotificationLocale.EN, Map.of("tier", "GRAN_RESERVA"))).isEqualTo(new PushContent(
                "Reached Grand Reserve", "Your seal is now Grand Reserve. Tap to see your points.", "/points"));
        assertThat(template.render(NotificationLocale.ES, Map.of("tier", "VINNOT"))).isEqualTo(new PushContent(
                "Alcanzaste Vinnot", "Tu sello ahora es Vinnot. Tocá para ver tus puntos.", "/points"));
        assertThat(template.render(NotificationLocale.EN, Map.of("tier", "VINNOT")).title()).isEqualTo("Reached Vinnot");
        assertThat(template.render(NotificationLocale.ES, Map.of("tier", "PARRA")).title()).isEqualTo("Alcanzaste Parra");
        assertThat(template.render(NotificationLocale.EN, Map.of("tier", "PARRA")).title()).isEqualTo("Reached Vine Leaf");
        assertThat(template.render(NotificationLocale.ES, Map.of("tier", "GRAN_ENOFILO")).title()).isEqualTo("Alcanzaste Gran Enófilo");
        assertThat(template.render(NotificationLocale.EN, Map.of("tier", "GRAN_ENOFILO")).title()).isEqualTo("Reached Connoisseur");
    }

    @Test
    void isACommunityPushThatNeverEmails() {
        assertThat(template.type()).isEqualTo(NotificationType.TIER_REACHED);
        assertThat(NotificationType.TIER_REACHED.category()).isEqualTo(NotificationCategory.COMMUNITY);
        assertThat(NotificationType.TIER_REACHED.emails()).isFalse();
        assertThat(NotificationType.TIER_REACHED.engagement()).isFalse();
    }
}
