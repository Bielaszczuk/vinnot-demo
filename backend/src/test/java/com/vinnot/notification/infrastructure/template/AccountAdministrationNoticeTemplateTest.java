package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AccountAdministrationNoticeTemplateTest {
    private final AccountEmailTemplates templates = new AccountEmailTemplates();

    @Test
    void aSuspensionNamesThePresetReasonAndOffersAReview() {
        NotificationTemplate template = templates.accountSuspendedTemplate(GoldenEmails.brand(), GoldenEmails.SITE);
        RenderedNotification spam = template.render(request(NotificationType.ACCOUNT_SUSPENDED, NotificationLocale.ES,
                Map.of("reasonCode", "SPAM")));
        assertThat(spam.subject()).isEqualTo("Suspendimos tu cuenta de Vinnot");
        assertThat(spam.text()).contains("Motivo: Spam o actividad promocional no permitida.",
                "Pedir una revisión: " + GoldenEmails.SITE + "/contact").doesNotContain("Detalle", "no fuiste vos");

        RenderedNotification other = template.render(request(NotificationType.ACCOUNT_SUSPENDED, NotificationLocale.EN,
                Map.of("reasonCode", "UNKNOWN", "note", "Shared <private> data")));
        assertThat(other.text()).contains("Reason: A breach of the Vinnot rules.", "Details: Shared <private> data");
        assertThat(other.html()).contains("Shared &lt;private&gt; data");
    }

    @Test
    void roleReinstatementAndDeletionUseTheirOwnCopy() {
        RenderedNotification role = templates.accountRoleChangedTemplate(GoldenEmails.brand(), GoldenEmails.SITE)
                .render(request(NotificationType.ACCOUNT_ROLE_CHANGED, NotificationLocale.ES, Map.of("role", "PARTNER")));
        assertThat(role.text()).contains("Ahora tenés el rol Organizador.");

        RenderedNotification back = templates.accountReinstatedTemplate(GoldenEmails.brand(), GoldenEmails.SITE)
                .render(request(NotificationType.ACCOUNT_REINSTATED, NotificationLocale.EN, Map.of()));
        assertThat(back.subject()).isEqualTo("We reactivated your Vinnot account");
        assertThat(back.text()).contains("Sign in: " + GoldenEmails.SITE + "/login");

        NotificationTemplate deleted = templates.accountDeletedByAdminTemplate(GoldenEmails.brand(), GoldenEmails.SITE);
        assertThat(deleted.render(request(NotificationType.ACCOUNT_DELETED_BY_ADMIN, NotificationLocale.ES, Map.of())).text())
                .contains("Un administrador eliminó tu cuenta de Vinnot");
        assertThat(deleted.type()).isEqualTo(NotificationType.ACCOUNT_DELETED_BY_ADMIN);
    }

    private static NotificationRequest request(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(type, NotificationRecipient.address("ana@vinnot.com", "Ana"), locale, data, "admin:1");
    }
}
