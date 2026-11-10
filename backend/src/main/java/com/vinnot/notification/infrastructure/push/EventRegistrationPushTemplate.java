package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * The attendee's registration changed; a tap opens the ticket. A declined, reported or refunded payment says so,
 * otherwise the registration status leads. A status without its own copy gets a neutral update.
 */
@Component
class EventRegistrationPushTemplate extends BundlePushTemplate {
    private static final Set<String> PAYMENT_LED = Set.of("REJECTED", "REPORTED", "REFUNDED");

    EventRegistrationPushTemplate() {
        super(NotificationType.EVENT_REGISTRATION_ATTENDEE, "registration");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        String payment = data.getOrDefault("paymentStatus", "");
        String key = PAYMENT_LED.contains(payment) ? "payment." + payment : "status." + required(data, "status");
        if (!copy.has(key + ".title")) {
            key = "update";
        }
        return content(copy, key, Map.of("event", required(data, "title")), "/my-tickets/" + required(data, "registrationId"));
    }
}
