package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** S6 (#489): the batch-ready push counts the new posts in both languages and opens the app. */
class SocialBatchReadyPushTemplateTest {

    @Test
    void countsSeveralNewPostsAndOpensTheApp() {
        var template = new SocialBatchReadyPushTemplate();
        Map<String, String> data = Map.of("count", "6", "from", "2026-11-02", "to", "2026-11-15");
        assertThat(template.render(NotificationLocale.ES, data)).isEqualTo(new PushContent("Publicaciones listas para revisar",
                "Hay 6 publicaciones sociales nuevas esperando tu aprobación en el panel web.", "/"));
        assertThat(template.render(NotificationLocale.EN, data).body())
                .isEqualTo("6 new social posts are waiting for your approval in the web admin.");
        assertThat(template.type()).isEqualTo(NotificationType.SOCIAL_BATCH_READY);
    }

    @Test
    void namesASinglePost() {
        var template = new SocialBatchReadyPushTemplate();
        assertThat(template.render(NotificationLocale.ES, Map.of("count", "1")).body())
                .isEqualTo("Hay 1 publicación social nueva esperando tu aprobación en el panel web.");
        assertThat(template.render(NotificationLocale.EN, Map.of("count", "1")).body())
                .isEqualTo("1 new social post is waiting for your approval in the web admin.");
    }
}
