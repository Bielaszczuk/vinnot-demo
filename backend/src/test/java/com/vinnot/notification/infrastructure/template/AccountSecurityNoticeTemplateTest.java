package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccountSecurityNoticeTemplateTest {
    private static final String SITE = "https://vinnot.example";
    private final AccountEmailTemplates templates = new AccountEmailTemplates();

    @Test
    void aPasswordChangeOffersAResetLinkIfItWasNotTheReader() {
        var message = templates.passwordChangedTemplate(GoldenEmails.brand(), SITE).render(request(
                NotificationType.ACCOUNT_PASSWORD_CHANGED, NotificationLocale.ES, Map.of()));

        assertThat(message.subject()).isEqualTo("Tu contraseña de Vinnot cambió");
        assertThat(message.html()).contains("Hola Ana,", "La contraseña de tu cuenta se cambió.",
                "href=\"" + SITE + "/forgot-password\"", "Restablecer contraseña");
        assertThat(message.text()).contains("Si no fuiste tú, restablece tu contraseña", SITE + "/forgot-password");
    }

    @Test
    void aTemporarySignInLockSaysWhatHappenedAndOffersTheResetLink() {
        var es = templates.loginLockedTemplate(GoldenEmails.brand(), SITE).render(request(
                NotificationType.ACCOUNT_LOGIN_LOCKED, NotificationLocale.ES, Map.of()));
        assertThat(es.subject()).isEqualTo("Bloqueamos por un rato el inicio de sesión en tu cuenta de Vinnot");
        assertThat(es.html()).contains("Hola Ana,", "varios intentos seguidos con una contraseña incorrecta",
                "href=\"" + SITE + "/forgot-password\"", "Restablecer contraseña");

        var en = templates.loginLockedTemplate(GoldenEmails.brand(), SITE).render(request(
                NotificationType.ACCOUNT_LOGIN_LOCKED, NotificationLocale.EN, Map.of()));
        assertThat(en.subject()).isEqualTo("We paused sign-in to your Vinnot account for a while");
        assertThat(en.text()).contains("several attempts in a row with a wrong password", "If this was not you, reset your password",
                SITE + "/forgot-password");
    }

    @Test
    void aLinkedProviderIsNamedReadably() {
        var message = templates.socialLinkedTemplate(GoldenEmails.brand(), SITE).render(request(
                NotificationType.ACCOUNT_SOCIAL_LINKED, NotificationLocale.EN, Map.of(NotificationType.PROVIDER, "FACEBOOK")));

        assertThat(message.subject()).isEqualTo("A new sign-in method was linked to your Vinnot account");
        assertThat(message.html()).contains("You can now sign in to your account with Facebook.", "Reset password");
    }

    @Test
    void aLinkNoticeNeedsTheProvider() {
        var template = templates.socialLinkedTemplate(GoldenEmails.brand(), SITE);
        assertThatThrownBy(() -> template.render(request(NotificationType.ACCOUNT_SOCIAL_LINKED, NotificationLocale.ES, Map.of())))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("provider");
    }

    @Test
    void deactivationKeepsTheResetLinkAndDeletionPointsOnlyToSupport() {
        var deactivated = templates.accountDeactivatedTemplate(GoldenEmails.brand(), SITE).render(request(
                NotificationType.ACCOUNT_DEACTIVATED, NotificationLocale.ES, Map.of()));
        assertThat(deactivated.html()).contains("Desactivaste tu cuenta.", SITE + "/forgot-password");

        var deleted = templates.accountDeletedTemplate(GoldenEmails.brand(), SITE + "/").render(request(
                NotificationType.ACCOUNT_DELETED, NotificationLocale.EN, Map.of()));
        assertThat(deleted.subject()).isEqualTo("Your Vinnot account was deleted");
        assertThat(deleted.html()).contains("Your account and your personal data were deleted.", "If you did not do this, contact support.")
                .doesNotContain("forgot-password", "Reset password");
    }

    private static NotificationRequest request(NotificationType type, NotificationLocale locale, Map<String, String> data) {
        return NotificationRequest.of(type, NotificationRecipient.address("ana@example.test", "Ana"), locale, data, "test");
    }
}
