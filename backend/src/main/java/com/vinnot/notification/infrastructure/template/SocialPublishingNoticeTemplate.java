package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * What social publishing needs from the administrators (#510): a post that failed (on a {@code network}, with the
 * {@code error} code explained), a TikTok draft to finish in the TikTok app, or an account to connect again. Each links to
 * the social posts admin page. Copy: {@code email/social_publishing_*.properties}, one key prefix per notice.
 */
public class SocialPublishingNoticeTemplate extends BundleEmailTemplate {
    static final String ADMIN_PATH = "/admin/social-posts";
    private final String key;
    private final String website;

    public SocialPublishingNoticeTemplate(NotificationType type, String key, BrandedEmailTemplate brand, String website) {
        super(type, "social_publishing", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.key = key;
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        Map<String, String> values = new HashMap<>();
        String network = request.data().get("network");
        if (Objects.nonNull(network)) {
            values.put("network", copy.has("network." + network) ? copy.text("network." + network) : network);
        }
        String error = request.data().get("error");
        if (Objects.nonNull(error)) {
            values.put("reason", copy.has("error." + error) ? copy.text("error." + error) : copy.text("error.other", Map.of("code", error)));
        }
        String subject = copy.text(key + ".subject", values);
        String greeting = greeting(copy, request.recipient().displayName());
        String intro = copy.text(key + (Objects.isNull(network) && copy.has(key + ".introAll") ? ".introAll" : ".intro"), values);
        String help = copy.text(key + ".help");
        String action = copy.text(key + ".action");
        String link = website + ADMIN_PATH;
        String text = greeting + "\n\n" + intro + "\n\n" + help + "\n" + action + ": " + link + "\n";
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(intro)
                + BrandedEmailTemplate.paragraph(help) + BrandedEmailTemplate.action(link, action, language);
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, intro, html));
    }
}
