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

class AccountEmailTemplatesTest {
    private final AccountEmailTemplates configuration = new AccountEmailTemplates();
    private final NotificationTemplateRegistry registry = new NotificationTemplateRegistry(NotificationTemplates.all(GoldenEmails.brand()));

    @Test
    void reproducesThePreviousAccountLinkEmails() {
        GoldenEmails.assertSame("email-verification", "ana@example.test", registry.render(link(
                NotificationType.ACCOUNT_EMAIL_VERIFICATION, "ana@example.test", "Ana & María",
                GoldenEmails.SITE + "/verify-email?token=demo-verification")));
        GoldenEmails.assertSame("password-reset", "ana@example.test", registry.render(link(
                NotificationType.ACCOUNT_PASSWORD_RESET, "ana@example.test", "Ana",
                GoldenEmails.SITE + "/reset-password?token=demo-reset")));
        GoldenEmails.assertSame("email-change-confirmation", "new@example.test", registry.render(link(
                NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION, "new@example.test", "Ana",
                GoldenEmails.SITE + "/confirm-email-change?token=demo-change")));
    }

    @Test
    void reproducesThePreviousEmailChangedNotice() {
        GoldenEmails.assertSame("email-changed", "previous@example.test", registry.render(NotificationRequest.of(
                NotificationType.ACCOUNT_EMAIL_CHANGED, NotificationRecipient.address("previous@example.test", "Ana"),
                NotificationLocale.ES, Map.of("newEmail", "new@example.test"), "ACCOUNT_EMAIL_CHANGED:1")));
    }

    @Test
    void rendersEveryAccountEmailInEnglish() {
        // Issue #295: account emails were always Spanish.
        GoldenEmails.assertSame("email-verification-en", "ana@example.test", registry.render(link(
                NotificationType.ACCOUNT_EMAIL_VERIFICATION, NotificationLocale.EN, "ana@example.test", "Ana & María",
                GoldenEmails.SITE + "/verify-email?token=demo-verification")));
        GoldenEmails.assertSame("password-reset-en", "ana@example.test", registry.render(link(
                NotificationType.ACCOUNT_PASSWORD_RESET, NotificationLocale.EN, "ana@example.test", "Ana",
                GoldenEmails.SITE + "/reset-password?token=demo-reset")));
        GoldenEmails.assertSame("email-change-confirmation-en", "new@example.test", registry.render(link(
                NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION, NotificationLocale.EN, "new@example.test", "Ana",
                GoldenEmails.SITE + "/confirm-email-change?token=demo-change")));
        GoldenEmails.assertSame("email-changed-en", "previous@example.test", registry.render(NotificationRequest.of(
                NotificationType.ACCOUNT_EMAIL_CHANGED, NotificationRecipient.address("previous@example.test", "Ana"),
                NotificationLocale.EN, Map.of("newEmail", "new@example.test"), "ACCOUNT_EMAIL_CHANGED:1")));
    }

    @Test
    void accountEmailsSupportSpanishAndEnglishAndRejectNonWebLinks() {
        var template = configuration.passwordResetTemplate(GoldenEmails.brand());
        assertThat(template.type()).isEqualTo(NotificationType.ACCOUNT_PASSWORD_RESET);
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
        assertThat(configuration.emailChangedTemplate(GoldenEmails.brand()).locales())
                .containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
        assertThatThrownBy(() -> registry.render(link(NotificationType.ACCOUNT_PASSWORD_RESET, "ana@example.test", "Ana",
                "javascript:alert(1)"))).isInstanceOf(IllegalArgumentException.class);
        var blank = registry.render(link(NotificationType.ACCOUNT_EMAIL_VERIFICATION, "ana@example.test", " ",
                GoldenEmails.SITE + "/verify-email?token=t"));
        assertThat(blank.text()).startsWith("Hola,\n\n");
        var blankEnglish = registry.render(link(NotificationType.ACCOUNT_EMAIL_VERIFICATION, NotificationLocale.EN,
                "ana@example.test", " ", GoldenEmails.SITE + "/verify-email?token=t"));
        assertThat(blankEnglish.text()).startsWith("Hi,\n\n");
    }

    @Test
    void substitutesUserValuesOnceSoPlaceholderLookalikesStayLiteral() {
        var copy = EmailCopy.load("account", NotificationLocale.ES);
        assertThat(copy.text("emailChanged.html", Map.of("email", "{url}$1\\"))).isEqualTo("El correo de tu cuenta fue cambiado a {url}$1\\.");
        assertThatThrownBy(() -> copy.text("emailChanged.html", Map.of())).hasMessageContaining("email");
    }

    private static NotificationRequest link(NotificationType type, String recipient, String name, String url) {
        return link(type, NotificationLocale.ES, recipient, name, url);
    }

    private static NotificationRequest link(NotificationType type, NotificationLocale locale, String recipient,
            String name, String url) {
        return NotificationRequest.of(type, NotificationRecipient.address(recipient, name), locale,
                Map.of(NotificationType.ACTION_URL, url), type + ":1");
    }
}
