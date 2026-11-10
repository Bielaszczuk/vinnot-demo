package com.vinnot.notification.infrastructure.template;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.application.service.DeliverNotificationService;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.infrastructure.delivery.SesNotificationDeliveryAdapter;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadCodec;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadSealer;
import com.vinnot.notification.infrastructure.template.AccountEmailTemplates;
import com.vinnot.notification.infrastructure.template.NotificationTemplate;
import com.vinnot.notification.infrastructure.template.NotificationTemplateRegistry;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.UnsubscribeLinkPort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Account links stay secret: unique nonces, tamper rejection and no leaks on delivery failure. */
class NotificationSecretHandlingTest {
    private static final String TOKEN = "RAW-TOKEN-0123456789abcdef";
    private static final String URL = GoldenEmails.SITE + "/reset-password?token=" + TOKEN;

    @Test
    void everySealUsesAFreshNonceAndTamperedCiphertextIsRejectedWithoutLeakingTheValue() {
        var sealer = new NotificationPayloadSealer("test-secret");
        String first = sealer.seal(URL, "ctx");
        String second = sealer.seal(URL, "ctx");
        assertThat(first).isNotEqualTo(second);
        assertThat(first.substring(3, 3 + 16)).isNotEqualTo(second.substring(3, 3 + 16));
        byte[] bytes = Base64.getDecoder().decode(first.substring(3));
        bytes[bytes.length - 1] ^= 0x01;
        String tampered = "v1:" + Base64.getEncoder().encodeToString(bytes);
        Throwable failure = catchThrowable(() -> sealer.open(tampered, "ctx"));
        assertThat(failure).isInstanceOf(IllegalStateException.class).hasNoCause();
        assertThat(failure.getMessage()).doesNotContain(TOKEN);
        bytes = Base64.getDecoder().decode(first.substring(3));
        bytes[0] ^= 0x01; // nonce
        String badNonce = "v1:" + Base64.getEncoder().encodeToString(bytes);
        assertThatThrownBy(() -> sealer.open(badNonce, "ctx")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anSesFailureCarryingTheLinkNeverReachesLogsExceptionsOrMetricTags() {
        SesV2Client client = mock(SesV2Client.class);
        when(client.sendEmail(any(SendEmailRequest.class)))
                .thenThrow(SdkClientException.create("provider echoed " + URL + " to ana@example.test"));
        var meters = new SimpleMeterRegistry();
        var ses = new SesNotificationDeliveryAdapter(client, "no-reply@vinnot.example", new OperationalTelemetry(meters), "");
        List<NotificationTemplate> templates = NotificationTemplates.all(GoldenEmails.brand());
        var service = new DeliverNotificationService(mock(NotificationRecipientDirectoryPort.class),
                new NotificationTemplateRegistry(templates), ses,
                mock(NotificationPreferenceRepositoryPort.class),
                mock(UnsubscribeLinkPort.class),
                mock(EmailSuppressionPort.class), mock(AnnouncementStatsPort.class));
        var codec = new NotificationPayloadCodec(new NotificationPayloadSealer("test-secret"));
        var request = NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET,
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, URL), "ACCOUNT_PASSWORD_RESET:secret-test");
        var payload = codec.encode(request);
        assertThat(payload.toString()).doesNotContain(TOKEN);

        Logger root = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        root.addAppender(appender);
        try {
            Throwable failure = catchThrowable(() -> service.deliver(codec.decode(payload)));
            assertThat(failure).isNotNull();
            for (Throwable t = failure; t != null; t = t.getCause()) {
                assertThat(String.valueOf(t.getMessage())).doesNotContain(TOKEN).doesNotContain("ana@example.test");
                assertThat(t.toString()).doesNotContain(TOKEN);
            }
        } finally {
            root.detachAppender(appender);
        }
        assertThat(appender.list).isNotEmpty();
        appender.list.forEach(event -> {
            assertThat(event.getFormattedMessage()).doesNotContain(TOKEN).doesNotContain("ana@example.test");
            if (event.getThrowableProxy() != null) {
                assertThat(event.getThrowableProxy().getMessage()).doesNotContain(TOKEN);
            }
        });
        assertThat(request.toString()).doesNotContain(TOKEN).doesNotContain("ana@example.test");
        assertThat(meters.counter("vinnot.email.failures").count()).isEqualTo(1.0);
        meters.getMeters().forEach(meter -> assertThat(meter.getId().toString()).doesNotContain(TOKEN).doesNotContain("ana@"));
    }
}
