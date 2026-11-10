package com.vinnot.notification.infrastructure.template;

import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Community activity emails (#308): comments on a member's reviews and the weekly likes summary. */
@Configuration
public class CommunityEmailTemplates {
    @Bean
    NotificationTemplate reviewCommentTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new ReviewCommentTemplate(brand, website);
    }

    @Bean
    NotificationTemplate reviewLikesTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new ReviewLikesTemplate(brand, website);
    }
}
