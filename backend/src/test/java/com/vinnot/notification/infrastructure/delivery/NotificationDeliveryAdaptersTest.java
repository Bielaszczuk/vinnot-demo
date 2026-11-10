package com.vinnot.notification.infrastructure.delivery;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.infrastructure.config.AwsServiceClientConfiguration;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

import java.util.function.Consumer;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationDeliveryAdaptersTest {
    private final SesV2Client client = mock(SesV2Client.class);
    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final RenderedNotification message = new RenderedNotification("Asunto", "Texto", "<p>Html</p>");

    @Test
    void sesSendsUtf8BodiesFromTheVinnotDisplayNameThroughTheSharedClient() {
        new SesNotificationDeliveryAdapter(client, "no-reply@vinnot.example", new OperationalTelemetry(registry), "")
                .send(NotificationType.SUPPORT_REQUEST, "ana@example.test", message);
        var request = captured();
        assertThat(request.fromEmailAddress()).isEqualTo("Vinnot <no-reply@vinnot.example>");
        assertThat(request.destination().toAddresses()).containsExactly("ana@example.test");
        assertThat(request.replyToAddresses()).isEmpty();
        var simple = request.content().simple();
        assertThat(simple.subject().data()).isEqualTo("Asunto");
        assertThat(simple.subject().charset()).isEqualTo("UTF-8");
        assertThat(simple.body().text().data()).isEqualTo("Texto");
        assertThat(simple.body().html().data()).isEqualTo("<p>Html</p>");
        assertThat(simple.body().html().charset()).isEqualTo("UTF-8");
        assertThat(simple.hasHeaders()).as("transactional mail sends no custom headers").isFalse();
        assertThat(request.configurationSetName()).as("no configuration set unless one is configured").isNull();
    }

    @Test
    void sesSendsThroughTheConfiguredConfigurationSetSoBouncesReachTheFeedbackQueue() {
        new SesNotificationDeliveryAdapter(client, "no-reply@vinnot.example", new OperationalTelemetry(registry),
                " vinnot-prod ").send(NotificationType.SUPPORT_REQUEST, "ana@example.test", message);
        assertThat(captured().configurationSetName()).isEqualTo("vinnot-prod");
    }

    @Test
    void sesSendsTheUnsubscribeHeadersOfAPromotionalMessage() {
        new SesNotificationDeliveryAdapter(client, "no-reply@vinnot.example", new OperationalTelemetry(registry), "")
                .send(NotificationType.NEWSLETTER, "ana@example.test", new RenderedNotification("s", "t", "h")
                        .withHeaders(Map.of("List-Unsubscribe", "<https://api.vinnot.test/u?token=t>")));
        var headers = captured().content().simple().headers();
        assertThat(headers).hasSize(1);
        assertThat(headers.getFirst().name()).isEqualTo("List-Unsubscribe");
        assertThat(headers.getFirst().value()).isEqualTo("<https://api.vinnot.test/u?token=t>");
    }

    @Test
    void sesKeepsAConfiguredDisplayNameAndSetsReplyToWhenTheMessageAsksForIt() {
        new SesNotificationDeliveryAdapter(client, "Equipo <team@vinnot.example>", new OperationalTelemetry(registry), "")
                .send(NotificationType.SUPPORT_REQUEST, "support@vinnot.example",
                        new RenderedNotification("s", "t", "h", "requester@example.org"));
        var request = captured();
        assertThat(request.fromEmailAddress()).isEqualTo("Equipo <team@vinnot.example>");
        assertThat(request.replyToAddresses()).containsExactly("requester@example.org");
    }

    @Test
    void sesFailuresAreCountedLoggedWithoutDetailsAndNotReplayed() {
        when(client.sendEmail(any(SendEmailRequest.class)))
                .thenThrow(new IllegalStateException("secret-token private@example.test provider-body"));
        var adapter = new SesNotificationDeliveryAdapter(client, "no-reply@vinnot.example", new OperationalTelemetry(registry), "");
        withLogs(SesNotificationDeliveryAdapter.class, logs -> {
            assertThatThrownBy(() -> adapter.send(NotificationType.SUPPORT_REQUEST, "private@example.test", message))
                    .isInstanceOf(ExternalServiceUnavailableException.class).hasNoCause()
                    .extracting("code").isEqualTo("EMAIL_DELIVERY_FAILED");
            verify(client, times(1)).sendEmail(any(SendEmailRequest.class));
            assertThat(registry.get("vinnot.email.failures").counter().count()).isEqualTo(1);
            assertThat(logs.list).hasSize(1);
            assertThat(logs.list.getFirst().getFormattedMessage()).contains("SUPPORT_REQUEST", "IllegalStateException")
                    .doesNotContain("secret-token", "private@example.test", "provider-body");
        });
    }

    @Test
    void providerSelectsExactlyOneAdapterAndSesUsesTheSharedBudgetedClient() {
        var runner = new ApplicationContextRunner()
                .withInitializer(context -> context.getBeanFactory()
                        .setConversionService(ApplicationConversionService.getSharedInstance()))
                .withUserConfiguration(AwsServiceClientConfiguration.class, SesNotificationDeliveryAdapter.class,
                        LoggingNotificationDeliveryAdapter.class)
                .withBean(OperationalTelemetry.class, () -> new OperationalTelemetry(registry));
        runner.withPropertyValues("app.auth.email.provider=ses", "app.auth.email.from=no-reply@vinnot.example")
                .run(context -> {
                    assertThat(context).hasSingleBean(SesV2Client.class).hasSingleBean(NotificationDeliveryPort.class)
                            .hasSingleBean(SesNotificationDeliveryAdapter.class);
                    assertThat(context.getBean(SesNotificationDeliveryAdapter.class))
                            .extracting("client").isSameAs(context.getBean(SesV2Client.class));
                });
        runner.run(context -> assertThat(context).doesNotHaveBean(SesV2Client.class)
                .hasSingleBean(LoggingNotificationDeliveryAdapter.class));
    }

    @Test
    void theLogProviderRecordsOnlyTheTypeForEveryNotification() {
        withLogs(LoggingNotificationDeliveryAdapter.class, logs -> {
            new LoggingNotificationDeliveryAdapter().send(NotificationType.SUPPORT_REQUEST, "private@example.test",
                    new RenderedNotification("s", "https://vinnot.example/reset-password?token=secret", "h"));
            assertThat(logs.list).singleElement().extracting(ILoggingEvent::getFormattedMessage)
                    .isEqualTo("SUPPORT_REQUEST notification requested (log provider; message not delivered)");
        });
    }

    private SendEmailRequest captured() {
        var capture = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(client).sendEmail(capture.capture());
        return capture.getValue();
    }

    private static void withLogs(Class<?> source, Consumer<ListAppender<ILoggingEvent>> assertions) {
        Logger logger = (Logger) LoggerFactory.getLogger(source);
        var logs = new ListAppender<ILoggingEvent>();
        logs.start();
        logger.addAppender(logs);
        try {
            assertions.accept(logs);
        } finally {
            logger.detachAppender(logs);
            logs.stop();
        }
    }
}
