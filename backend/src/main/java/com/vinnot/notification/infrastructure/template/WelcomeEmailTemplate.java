package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.util.List;
import java.util.Set;

/** Welcome for a new account: what to do first, with links to the key areas. Transactional, no offers. */
public class WelcomeEmailTemplate extends BundleEmailTemplate {
    /** Copy key and site path of each area the welcome points to, in order. */
    static final List<String[]> AREAS = List.of(
            new String[] {"wines", "/wines"},
            new String[] {"cellar", "/cellar"},
            new String[] {"events", "/events"},
            new String[] {"routes", "/wine-routes"});
    private final String website;

    public WelcomeEmailTemplate(BrandedEmailTemplate brand, String website) {
        super(NotificationType.ACCOUNT_WELCOME, AccountEmailTemplates.BUNDLE, brand, Set.of(NotificationLocale.ES, NotificationLocale.EN));
        this.website = website.endsWith("/") ? website.substring(0, website.length() - 1) : website;
    }

    @Override
    protected RenderedNotification render(NotificationRequest request, EmailCopy copy, BrandedEmailTemplate.Language language) {
        final String subject = copy.text("welcome.subject");
        String greeting = greeting(copy, request.recipient().displayName());
        StringBuilder text = new StringBuilder(greeting).append("\n\n").append(copy.text("welcome.intro")).append('\n');
        StringBuilder html = new StringBuilder(BrandedEmailTemplate.paragraph(greeting))
                .append(BrandedEmailTemplate.paragraph(copy.text("welcome.intro")));
        for (String[] area : AREAS) {
            String title = copy.text("welcome." + area[0] + ".title");
            String body = copy.text("welcome." + area[0] + ".body");
            text.append("\n- ").append(title).append(": ").append(body).append(' ').append(website).append(area[1]);
            html.append(BrandedEmailTemplate.detail(title, body + "\n" + website + area[1]));
        }
        html.append(BrandedEmailTemplate.action(website + AREAS.getFirst()[1], copy.text("welcome.action"), language))
                .append(BrandedEmailTemplate.paragraph(copy.text("welcome.closing")));
        text.append("\n\n").append(copy.text("welcome.closing"));
        return new RenderedNotification(subject, brand().text(language, text.toString()),
                brand().html(language, subject, copy.text("welcome.intro"), html.toString()));
    }
}
