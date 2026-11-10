package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Base for email templates whose copy lives in one resource bundle per locale and whose body is
 * wrapped in the shared branded layout. Bundles load at construction, so a missing one fails at startup.
 */
public abstract class BundleEmailTemplate implements NotificationTemplate {
    private final NotificationType type;
    private final BrandedEmailTemplate brand;
    private final Map<NotificationLocale, EmailCopy> copies = new EnumMap<>(NotificationLocale.class);

    protected BundleEmailTemplate(NotificationType type, String bundle, BrandedEmailTemplate brand,
            Set<NotificationLocale> locales) {
        this.type = type;
        this.brand = brand;
        locales.forEach(locale -> copies.put(locale, EmailCopy.load(bundle, locale)));
    }

    @Override
    public NotificationType type() {
        return type;
    }

    @Override
    public Set<NotificationLocale> locales() {
        return Set.copyOf(copies.keySet());
    }

    @Override
    public RenderedNotification render(NotificationRequest request) {
        return render(request, copies.get(request.locale()), language(request.locale()));
    }

    protected abstract RenderedNotification render(NotificationRequest request, EmailCopy copy,
            BrandedEmailTemplate.Language language);

    protected BrandedEmailTemplate brand() {
        return brand;
    }

    protected static String required(NotificationRequest request, String key) {
        return Objects.requireNonNull(request.data().get(key), "Notification data is missing " + key);
    }

    /** "Hola Ana," or "Hola," from the bundle's {@code greeting} and {@code greetingNamed} keys. */
    protected static String greeting(EmailCopy copy, String displayName) {
        return Objects.isNull(displayName) || displayName.isBlank()
                ? copy.text("greeting") : copy.text("greetingNamed", Map.of("name", displayName.trim()));
    }

    private static BrandedEmailTemplate.Language language(NotificationLocale locale) {
        return locale == NotificationLocale.EN ? BrandedEmailTemplate.Language.EN : BrandedEmailTemplate.Language.ES;
    }
}
