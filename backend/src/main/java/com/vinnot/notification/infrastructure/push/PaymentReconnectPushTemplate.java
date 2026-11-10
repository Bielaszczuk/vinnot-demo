package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/** The organizer must connect Mercado Pago again (#309); a tap opens their events, where the connection lives. */
@Component
class PaymentReconnectPushTemplate extends BundlePushTemplate {
    PaymentReconnectPushTemplate() {
        super(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, "payment");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        return content(copy, "reconnect", Map.of(), "/partner/events");
    }
}
