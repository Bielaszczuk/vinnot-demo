package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EventRegistrationTemplates {
    @Bean
    NotificationTemplate eventRegistrationAttendeeTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new EventRegistrationTemplate(NotificationType.EVENT_REGISTRATION_ATTENDEE, false, brand, website);
    }

    @Bean
    NotificationTemplate eventRegistrationOrganizerTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new EventRegistrationTemplate(NotificationType.EVENT_REGISTRATION_ORGANIZER, true, brand, website);
    }

    @Bean
    NotificationTemplate eventCancelledAttendeeTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new EventCancelledAttendeeTemplate(brand, website);
    }

    @Bean
    NotificationTemplate eventChangedAttendeeTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new EventChangedAttendeeTemplate(brand, website);
    }

    @Bean
    NotificationTemplate eventReminderTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new EventReminderTemplate(brand, website);
    }

    @Bean
    NotificationTemplate eventCancelledOrganizerSummaryTemplate(BrandedEmailTemplate brand,
            @Value("${app.auth.frontend-base-url}") String website) {
        return new EventCancelledSummaryTemplate(brand, website);
    }
}
