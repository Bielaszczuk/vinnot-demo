package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** #510 S3/S5: the publishing pushes say what happened in both languages and open the app. */
class SocialPublishingPushTemplatesTest {
    private final SocialPublishingPushTemplates configuration = new SocialPublishingPushTemplates();
    private final PushTemplateRegistry registry = new PushTemplateRegistry(List.of(configuration.socialPostFailedPushTemplate(),
            configuration.socialTiktokDraftWaitingPushTemplate(), configuration.socialAccountReconnectPushTemplate()));

    @Test
    void aFailedPostNamesItsNetworkOrNone() {
        assertThat(registry.render(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.ES, Map.of("network", "INSTAGRAM", "error", "X")))
                .isEqualTo(new PushContent("Publicación fallida", "Una publicación no se pudo publicar en Instagram. Revísala en el panel web.",
                        "/"));
        assertThat(registry.render(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.EN, Map.of("error", "MEDIA_NOT_READY")).body())
                .isEqualTo("A scheduled post could not be published. Review it in the web admin.");
        assertThat(registry.render(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.EN, Map.of("network", "MASTODON")).body())
                .isEqualTo("A post could not be published on MASTODON. Review it in the web admin.");
    }

    @Test
    void aTiktokDraftAsksToFinishItInTheTiktokApp() {
        assertThat(registry.render(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, NotificationLocale.ES, Map.of("postId", "p-1")))
                .isEqualTo(new PushContent("Borrador en TikTok", "Termina de publicarlo desde la app de TikTok.", "/"));
        assertThat(registry.render(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, NotificationLocale.EN, Map.of()).body())
                .isEqualTo("Finish publishing it in the TikTok app.");
    }

    @Test
    void anAccountToReconnectNamesTheNetwork() {
        assertThat(registry.render(NotificationType.SOCIAL_ACCOUNT_RECONNECT, NotificationLocale.EN, Map.of("network", "THREADS")))
                .isEqualTo(new PushContent("Connect Threads again",
                        "The connection with Threads stopped working. Connect it again from the web admin.", "/"));
        assertThat(registry.render(NotificationType.SOCIAL_ACCOUNT_RECONNECT, NotificationLocale.ES, Map.of("network", "TIKTOK")).title())
                .isEqualTo("Vuelve a conectar TikTok");
    }
}
