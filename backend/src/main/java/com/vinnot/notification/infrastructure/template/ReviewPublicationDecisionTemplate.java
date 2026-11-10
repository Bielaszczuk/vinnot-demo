package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;

import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Locale;
import java.util.Map;
import java.util.MissingResourceException;
import java.util.Objects;
import java.util.Set;

/**
 * Tells the author whether their review or comment ({@code kind} REVIEW or COMMENT) was published (#307). A rejection
 * names the preset {@code reasonCode} in the bundle's words and links to the community guidelines; the moderator's
 * {@code note} only travels with the OTHER reason. Copy: {@code email/moderation_publication_*.properties}.
 */
public class ReviewPublicationDecisionTemplate extends BundleEmailTemplate {
    private final String website;

    public ReviewPublicationDecisionTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.REVIEW_PUBLICATION_DECISION, "moderation_publication", brand,
                Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String kind = "COMMENT".equals(required(request, "kind")) ? "comment" : "review";
        boolean approved = "APPROVED".equals(required(request, "status"));
        String prefix = (approved ? "approved." : "rejected.") + kind;
        final String subject = copy.text(prefix + ".subject");
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text(prefix + ".intro", Map.of("wine", required(request, "wineName")));
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro));
        StringBuilder text = new StringBuilder(greeting + "\n\n" + intro);
        String url;
        String action;
        if (approved) {
            url = website + "/wines/" + required(request, "wineId");
            action = copy.text("action.view");
        } else {
            String reason = reason(copy, request.data().get("reasonCode"));
            html.append(BrandedEmailTemplate.detail(copy.text("reason.label"), reason));
            text.append("\n").append(copy.text("reason.label")).append(": ").append(reason);
            String note = request.data().get("note");
            if (Objects.nonNull(note) && !note.isBlank()) {
                html.append(BrandedEmailTemplate.detail(copy.text("note.label"), note));
                text.append("\n").append(copy.text("note.label")).append(": ").append(note);
            }
            html.append(BrandedEmailTemplate.paragraph(copy.text("rejected.help")));
            text.append("\n\n").append(copy.text("rejected.help"));
            url = website + "/content-policy";
            action = copy.text("action.policy");
        }
        html.append(BrandedEmailTemplate.action(url, action, language));
        text.append("\n").append(action).append(": ").append(url);
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, subject, html.toString()));
    }

    private static String reason(EmailCopy copy, String code) {
        try {
            return copy.text("reason." + Objects.requireNonNullElse(code, "OTHER").toUpperCase(Locale.ROOT));
        } catch (MissingResourceException unknown) {
            return copy.text("reason.OTHER");
        }
    }
}
