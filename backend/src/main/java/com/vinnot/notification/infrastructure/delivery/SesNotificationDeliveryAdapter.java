package com.vinnot.notification.infrastructure.delivery;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.infrastructure.logging.SafeFailureDetails;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.MessageHeader;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.util.Objects;

/**
 * The only SES sender. It uses the shared client and its transport budgets; the outbox worker owns
 * retries, so an ambiguous failure is never replayed here.
 */
@Component
@ConditionalOnProperty(name = "app.auth.email.provider", havingValue = "ses")
public class SesNotificationDeliveryAdapter implements NotificationDeliveryPort {
    static final String DISPLAY_NAME = "Vinnot";
    private static final Logger LOGGER = LoggerFactory.getLogger(SesNotificationDeliveryAdapter.class);
    private final SesV2Client client;
    private final String from;
    private final OperationalTelemetry telemetry;
    private final String configurationSet;

    public SesNotificationDeliveryAdapter(SesV2Client client, @Value("${app.auth.email.from}") String sender,
            OperationalTelemetry telemetry,
            @Value("${app.auth.email.ses-configuration-set:}") String configurationSet) {
        this.client = client;
        this.from = sender.contains("<") ? sender : DISPLAY_NAME + " <" + sender + ">";
        this.telemetry = telemetry;
        this.configurationSet = configurationSet.trim();
    }

    @Override
    public void send(NotificationType type, String recipient, RenderedNotification message) {
        var simple = Message.builder().subject(content(message.subject()))
                .body(Body.builder().text(content(message.text())).html(content(message.html())).build());
        if (!message.headers().isEmpty()) {
            // Transactional messages keep sending no custom headers at all.
            simple.headers(message.headers().entrySet().stream()
                    .map(header -> MessageHeader.builder().name(header.getKey()).value(header.getValue()).build())
                    .toList());
        }
        var request = SendEmailRequest.builder().fromEmailAddress(from)
                .destination(Destination.builder().toAddresses(recipient).build())
                .content(EmailContent.builder().simple(simple.build()).build());
        if (!configurationSet.isEmpty()) {
            // The configuration set publishes bounces and complaints to the feedback queue.
            request.configurationSetName(configurationSet);
        }
        if (Objects.nonNull(message.replyTo())) {
            request.replyToAddresses(message.replyTo());
        }
        try {
            client.sendEmail(request.build());
        } catch (RuntimeException failure) {
            telemetry.recordEmailFailure();
            LOGGER.error("Notification delivery failed for {}: {}", type, SafeFailureDetails.describe(failure));
            throw new ExternalServiceUnavailableException("EMAIL_DELIVERY_FAILED", "Notification delivery failed", null);
        }
    }

    private static Content content(String value) {
        return Content.builder().data(value).charset("UTF-8").build();
    }
}
