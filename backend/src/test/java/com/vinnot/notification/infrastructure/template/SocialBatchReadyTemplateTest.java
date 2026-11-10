package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** S6: the batch notice counts the posts, names the window and links to the approval queue, in both languages. */
class SocialBatchReadyTemplateTest {
    private final NotificationTemplate template = new ModerationEmailTemplates()
            .socialBatchReadyTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");

    @Test
    void countsThePostsAndLinksToTheQueue() {
        var many = template.render(request(NotificationLocale.ES, "6"));
        assertThat(many.subject()).isEqualTo("6 publicaciones sociales esperan tu aprobación");
        assertThat(many.text()).contains("Hola,", "planificó la semana del 2026-11-02 al 2026-11-15 y dejó 6 publicaciones listas",
                "Revisar publicaciones: " + GoldenEmails.SITE + "/admin/social-posts");
        assertThat(many.html()).contains(GoldenEmails.SITE + "/admin/social-posts");

        var one = template.render(request(NotificationLocale.EN, "1"));
        assertThat(one.subject()).isEqualTo("One social post is waiting for your approval");
        assertThat(one.text()).contains("planned 2026-11-02 to 2026-11-15 and left one post ready", "Review posts: ");
    }

    @Test
    void isAnAdminOnlyTransactionalEmail() {
        assertThat(template.type()).isEqualTo(NotificationType.SOCIAL_BATCH_READY);
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
        assertThat(NotificationType.SOCIAL_BATCH_READY.category()).isEqualTo(NotificationCategory.MODERATION);
        assertThat(NotificationType.SOCIAL_BATCH_READY.emails()).isTrue();
        assertThat(NotificationType.SOCIAL_BATCH_READY.engagement()).isFalse();
    }

    private static NotificationRequest request(NotificationLocale locale, String count) {
        return NotificationRequest.of(NotificationType.SOCIAL_BATCH_READY, NotificationRecipient.user(UUID.randomUUID()), locale,
                Map.of("count", count, "from", "2026-11-02", "to", "2026-11-15"), "social-batch:2026-11-02:x");
    }
}
