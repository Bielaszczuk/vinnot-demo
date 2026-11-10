package com.vinnot.notification.infrastructure.delivery;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.domain.model.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Local default: records that a message was due without its recipient, links or content. */
@Component
@ConditionalOnProperty(name = "app.auth.email.provider", havingValue = "log", matchIfMissing = true)
public class LoggingNotificationDeliveryAdapter implements NotificationDeliveryPort {
    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingNotificationDeliveryAdapter.class);

    @Override
    public void send(NotificationType type, String recipient, RenderedNotification message) {
        LOGGER.info("{} notification requested (log provider; message not delivered)", type);
    }
}
