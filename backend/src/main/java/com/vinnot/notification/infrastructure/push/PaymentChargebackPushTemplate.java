package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/** The organizer learns that a buyer's bank reversed a payment; a tap opens their events. */
@Component
class PaymentChargebackPushTemplate extends BundlePushTemplate {
    PaymentChargebackPushTemplate() {
        super(NotificationType.PAYMENT_CHARGEBACK, "payment");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        return content(copy, "chargeback", Map.of("event", required(data, "title")), "/partner/events");
    }
}
