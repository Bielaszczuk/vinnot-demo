package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.MissingResourceException;
import java.util.Set;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationTemplateRegistryTest {
    @Test
    void resolvesTheTemplateRegisteredForTheTypeAndLocale() {
        var registry = new NotificationTemplateRegistry(NotificationTemplates.all(GoldenEmails.brand()));
        var rendered = registry.render(NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address("support@vinnot.example", null), NotificationLocale.EN,
                Map.of("requestId", "id", "name", "Name", "email", "reply@example.org", "subject", "privacy", "message", "Hi"),
                "support:id"));
        assertThat(rendered.subject()).isEqualTo("Vinnot — support request");
    }

    @Test
    void failsFastForAnUnsupportedLocaleInsteadOfFallingBack() {
        var registry = new NotificationTemplateRegistry(NotificationTemplates.all(GoldenEmails.brand()));
        var request = NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address("support@vinnot.example", null), NotificationLocale.ES, Map.of(), "support:id");
        assertThatThrownBy(() -> registry.render(request)).isInstanceOf(IllegalStateException.class)
                .hasMessage("No notification template SUPPORT_REQUEST/ES");
    }

    @Test
    void refusesToStartWithMissingOrDuplicateTemplates() {
        assertThatThrownBy(() -> new NotificationTemplateRegistry(List.of()))
                .hasMessageStartingWith("Missing notification template");
        var templates = new ArrayList<>(NotificationTemplates.all(GoldenEmails.brand()));
        templates.add(new FixedTemplate());
        assertThatThrownBy(() -> new NotificationTemplateRegistry(templates))
                .hasMessage("Duplicate notification template SUPPORT_REQUEST/EN");
    }

    @Test
    void copyHasNoLanguageFallbackAndSubstitutesPlaceholdersOnce() {
        assertThatThrownBy(() -> EmailCopy.load("support", NotificationLocale.ES)).isInstanceOf(MissingResourceException.class);
        var copy = EmailCopy.load("support", NotificationLocale.EN);
        assertThat(copy.text("reference")).isEqualTo("Reference");
        assertThatThrownBy(() -> copy.text("unknown")).isInstanceOf(MissingResourceException.class);
    }

    private static final class FixedTemplate implements NotificationTemplate {
        @Override public NotificationType type() { return NotificationType.SUPPORT_REQUEST; }
        @Override public Set<NotificationLocale> locales() { return Set.of(NotificationLocale.EN); }
        @Override public RenderedNotification render(NotificationRequest request) { return new RenderedNotification("s", "t", "h"); }
    }
}
