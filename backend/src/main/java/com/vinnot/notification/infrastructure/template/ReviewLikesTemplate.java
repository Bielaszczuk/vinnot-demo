package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * The week's likes on the member's reviews (#308): one like names the {@code liker}, several are counted ({@code likes}
 * across {@code reviews}) with the most liked review's wine, which the email links to ({@code wineId}).
 * Copy: {@code email/community_likes_*.properties}.
 */
public class ReviewLikesTemplate extends BundleEmailTemplate {
    private final String website;

    public ReviewLikesTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.REVIEW_LIKES_WEEKLY, "community_likes", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        String liker = request.data().get("liker");
        String shape = Objects.nonNull(liker) ? "one" : "1".equals(required(request, "reviews")) ? "review" : "reviews";
        Map<String, String> values = Objects.isNull(liker)
                ? Map.of("count", required(request, "likes"), "wine", required(request, "wineName"))
                : Map.of("name", liker, "wine", required(request, "wineName"));
        final String subject = copy.text(shape + ".subject", values);
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text(shape + ".intro", values);
        String preferences = copy.text("preferences");
        String url = website + "/wines/" + required(request, "wineId");
        String action = copy.text("action");
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.action(url, action, language) + BrandedEmailTemplate.paragraph(preferences);
        String text = greeting + "\n\n" + intro + "\n" + action + ": " + url + "\n\n" + preferences;
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }
}
