package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Tells a user who accepted earlier terms that a new revision is out and from which date ({@code requiredFrom}, shown
 * in {@code timeZone}) they must accept it to keep using Vinnot (#309). Copy: {@code email/terms_updated_*.properties}.
 */
public class TermsUpdatedTemplate extends BundleEmailTemplate {
    private static final ZoneId FALLBACK_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
    private final String website;

    public TermsUpdatedTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.TERMS_UPDATED, "terms_updated", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String date = DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG)
                .withLocale(Locale.forLanguageTag(request.locale().language()))
                .withZone(zone(request.data().get("timeZone")))
                .format(Instant.parse(required(request, "requiredFrom")));
        final String subject = copy.text("subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text("intro", Map.of("date", date));
        String until = copy.text("until");
        String url = website + "/terms";
        String action = copy.text("action");
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.paragraph(until) + BrandedEmailTemplate.action(url, action, language);
        String text = greeting + "\n\n" + intro + "\n\n" + until + "\n" + action + ": " + url;
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }

    private static ZoneId zone(String id) {
        if (Objects.isNull(id)) {
            return FALLBACK_ZONE;
        }
        try {
            return ZoneId.of(id);
        } catch (DateTimeException invalid) {
            return FALLBACK_ZONE;
        }
    }
}
