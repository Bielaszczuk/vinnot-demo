package com.vinnot.notification.infrastructure.template;

import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Support emails for requesters (#309): the acknowledgement of a support request. */
@Configuration
public class SupportEmailTemplates {
    @Bean
    NotificationTemplate supportRequestReceivedTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new SupportRequestReceivedTemplate(brand, website);
    }
}
