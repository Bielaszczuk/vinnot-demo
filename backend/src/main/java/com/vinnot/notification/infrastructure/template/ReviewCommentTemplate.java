package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Map;
import java.util.Set;

/**
 * Tells a review's author that {@code commenter} commented on their review of {@code wineName} (#308) and links to the
 * wine ({@code wineId}). Copy: {@code email/community_comment_*.properties}.
 */
public class ReviewCommentTemplate extends BundleEmailTemplate {
    private final String website;

    public ReviewCommentTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.REVIEW_COMMENT, "community_comment", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        Map<String, String> values = Map.of("name", required(request, "commenter"), "wine", required(request, "wineName"));
        final String subject = copy.text("subject", values);
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text("intro", values);
        String preferences = copy.text("preferences");
        String url = website + "/wines/" + required(request, "wineId");
        String action = copy.text("action");
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.action(url, action, language) + BrandedEmailTemplate.paragraph(preferences);
        String text = greeting + "\n\n" + intro + "\n" + action + ": " + url + "\n\n" + preferences;
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }
}
