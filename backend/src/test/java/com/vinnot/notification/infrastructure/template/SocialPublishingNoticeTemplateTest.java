package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** #510 S3/S5: the publishing notices explain what happened and link to the social posts admin, in both languages. */
class SocialPublishingNoticeTemplateTest {
    private final ModerationEmailTemplates templates = new ModerationEmailTemplates();
    private final NotificationTemplate failed = templates.socialPostFailedTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");
    private final NotificationTemplate draft = templates.socialTiktokDraftWaitingTemplate(GoldenEmails.brand(), GoldenEmails.SITE);
    private final NotificationTemplate reconnect = templates.socialAccountReconnectTemplate(GoldenEmails.brand(), GoldenEmails.SITE);

    @Test
    void aFailedPostNamesTheNetworkAndExplainsTheError() {
        var spanish = failed.render(request(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.ES,
                Map.of("postId", "p-1", "network", "INSTAGRAM", "error", "TOKEN_INVALID")));
        assertThat(spanish.subject()).isEqualTo("Una publicación social no se pudo publicar");
        assertThat(spanish.text()).contains("Hola,", "no se pudo publicar en Instagram: la conexión con la red venció o fue revocada.",
                "Ver publicaciones: " + GoldenEmails.SITE + "/admin/social-posts");
        assertThat(spanish.html()).contains(GoldenEmails.SITE + "/admin/social-posts");

        var english = failed.render(request(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.EN,
                Map.of("postId", "p-1", "network", "TIKTOK", "error", "PROCESSING_TIMEOUT")));
        assertThat(english.subject()).isEqualTo("A social post could not be published");
        assertThat(english.text()).contains("could not be published on TikTok: the network took too long to process the images.");
    }

    @Test
    void aPostThatFailedBeforePublishingOrWithAnUnknownCodeStillReads() {
        var noNetwork = failed.render(request(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.ES,
                Map.of("postId", "p-1", "error", "MEDIA_NOT_READY")));
        assertThat(noNetwork.text()).contains("La publicación programada no se pudo publicar: las imágenes no estuvieron listas a tiempo.");

        var unknown = failed.render(request(NotificationType.SOCIAL_POST_FAILED, NotificationLocale.EN,
                Map.of("postId", "p-1", "network", "MASTODON", "error", "SOMETHING_NEW")));
        assertThat(unknown.text()).contains("could not be published on MASTODON: error SOMETHING_NEW.");
    }

    @Test
    void aTiktokDraftAsksToFinishItInTheTiktokApp() {
        var spanish = draft.render(request(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, NotificationLocale.ES, Map.of("postId", "p-1")));
        assertThat(spanish.subject()).isEqualTo("Un borrador te espera en TikTok");
        assertThat(spanish.text()).contains("Abre la app de TikTok y termina de publicarla");

        var english = draft.render(request(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, NotificationLocale.EN, Map.of("postId", "p-1")));
        assertThat(english.text()).contains("Open the TikTok app and finish publishing it from your inbox.");
    }

    @Test
    void anAccountToReconnectNamesTheNetwork() {
        var spanish = reconnect.render(request(NotificationType.SOCIAL_ACCOUNT_RECONNECT, NotificationLocale.ES, Map.of("network", "THREADS")));
        assertThat(spanish.subject()).isEqualTo("Vuelve a conectar Threads");
        assertThat(spanish.text()).contains("La conexión con Threads dejó de funcionar", "Ir al panel: ");

        var english = reconnect.render(request(NotificationType.SOCIAL_ACCOUNT_RECONNECT, NotificationLocale.EN, Map.of("network", "TIKTOK")));
        assertThat(english.subject()).isEqualTo("Connect TikTok again");
    }

    @Test
    void theyAreAdminOnlyTransactionalEmailsInBothLanguages() {
        for (NotificationTemplate template : List.of(failed, draft, reconnect)) {
            assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
            assertThat(template.type().category()).isEqualTo(NotificationCategory.MODERATION);
            assertThat(template.type().emails()).isTrue();
            assertThat(template.type().engagement()).isFalse();
        }
        assertThat(List.of(failed.type(), draft.type(), reconnect.type())).containsExactly(NotificationType.SOCIAL_POST_FAILED,
                NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, NotificationType.SOCIAL_ACCOUNT_RECONNECT);
    }

    private static NotificationRequest request(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(type, NotificationRecipient.user(UUID.randomUUID()), locale, data, "social:test");
    }
}
