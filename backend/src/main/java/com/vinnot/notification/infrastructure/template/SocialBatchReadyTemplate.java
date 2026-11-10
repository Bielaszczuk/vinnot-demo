package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.Map;
import java.util.Set;

/**
 * The social media agent's batch notice (#489): how many posts wait for approval and the window they cover, with a
 * button to the approval queue. Copy: {@code email/social_batch_ready_*.properties}.
 */
public class SocialBatchReadyTemplate extends BundleEmailTemplate {
    static final String QUEUE_PATH = "/admin/social-posts";
    private final String website;

    public SocialBatchReadyTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.SOCIAL_BATCH_READY, "social_batch_ready", brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.replaceAll("/+$", "");
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        int count = Integer.parseInt(required(request, "count"));
        Map<String, String> values = Map.of("count", Integer.toString(count), "from", required(request, "from"), "to", required(request, "to"));
        String subject = copy.text(count == 1 ? "subject.one" : "subject.many", values);
        String greeting = greeting(copy, request.recipient().displayName());
        String line = copy.text(count == 1 ? "body.one" : "body.many", values);
        String action = copy.text("action");
        String url = website + QUEUE_PATH;
        String html = BrandedEmailTemplate.paragraph(greeting) + BrandedEmailTemplate.paragraph(line)
                + BrandedEmailTemplate.action(url, action, language);
        String text = greeting + "\n\n" + line + "\n" + action + ": " + url + "\n";
        return new RenderedNotification(subject, brand().text(language, text), brand().html(language, subject, subject, html));
    }
}
