package com.vinnot.notification.infrastructure;

import com.vinnot.notification.infrastructure.persistence.JdbcAnnouncementStats;
import com.vinnot.notification.infrastructure.persistence.JdbcNotificationPreferenceRepository;
import com.vinnot.notification.infrastructure.persistence.JdbcEmailSuppressionRepository;
import com.vinnot.notification.infrastructure.security.SealedUnsubscribeLinks;
import com.vinnot.notification.infrastructure.template.NewsletterTemplate;
import com.vinnot.notification.infrastructure.template.AnnouncementTestTemplate;
import com.vinnot.notification.infrastructure.template.ServiceNoticeTemplate;
import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.service.NotifyEventRegistrationService;
import com.vinnot.event.infrastructure.notification.EventRegistrationEffectHandler;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.application.service.DeliverNotificationService;
import com.vinnot.notification.application.service.EnqueueNotificationService;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.infrastructure.outbox.LegacyNotificationEffectHandler;
import com.vinnot.notification.infrastructure.outbox.NotificationEffectHandler;
import com.vinnot.notification.infrastructure.outbox.OutboxAttempts;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadCodec;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadSealer;
import com.vinnot.notification.infrastructure.outbox.NotificationRetention;
import com.vinnot.notification.infrastructure.outbox.OutboxNotificationAdapter;
import com.vinnot.notification.infrastructure.persistence.JdbcNotificationRecipientDirectory;
import com.vinnot.notification.infrastructure.template.AccountEmailTemplates;
import com.vinnot.notification.infrastructure.template.EventRegistrationTemplates;
import com.vinnot.notification.infrastructure.template.NotificationTemplateRegistry;
import com.vinnot.notification.infrastructure.template.SupportRequestTemplate;
import com.vinnot.notification.infrastructure.template.WineSubmissionStatusTemplate;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import com.vinnot.shared.infrastructure.effects.DurableEffectWorker;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.infrastructure.template.CommunityEmailTemplates;
import com.vinnot.notification.infrastructure.template.SupportEmailTemplates;
import com.vinnot.notification.infrastructure.template.ModerationEmailTemplates;
import com.vinnot.notification.infrastructure.template.PaymentEmailTemplates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/** A row sealed under a rotated jwt.secret must fail alone, not poison the worker. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false",
        "jwt.secret=current-secret", "app.auth.frontend-base-url=https://vinnot.example"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({DurableEffectQueue.class, DurableEffectWorker.class, ObjectMapper.class, EnqueueNotificationService.class,
        DeliverNotificationService.class, JdbcAnnouncementStats.class, OutboxAttempts.class,
        JdbcNotificationPreferenceRepository.class, JdbcEmailSuppressionRepository.class, SealedUnsubscribeLinks.class, NewsletterTemplate.class, ServiceNoticeTemplate.class, AnnouncementTestTemplate.class, OutboxNotificationAdapter.class, NotificationPayloadCodec.class,
        NotificationPayloadSealer.class, NotificationEffectHandler.class, NotificationTemplateRegistry.class,
        SupportRequestTemplate.class, WineSubmissionStatusTemplate.class, AccountEmailTemplates.class, BrandedEmailTemplate.class,
        JdbcNotificationRecipientDirectory.class, EventRegistrationTemplates.class, PaymentEmailTemplates.class, ModerationEmailTemplates.class, CommunityEmailTemplates.class, SupportEmailTemplates.class, EventRegistrationEffectHandler.class,
        NotifyEventRegistrationService.class, LegacyNotificationEffectHandler.class, NotificationRetention.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class NotificationSecretRotationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired DurableEffectQueue queue;
    @Autowired NotificationPort notifications;
    @Autowired DurableEffectWorker worker;
    @MockitoBean NotificationDeliveryPort delivery;
    @MockitoBean EventRegistrationNoticeReader notices;
    @MockitoBean PushNotificationPort pushes;
    @MockitoBean OrganizerActivityDigest digests;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void aRowSealedBeforeASecretRotationFailsAloneAndLaterRowsStillDeliver() {
        jdbc.update("DELETE FROM external_effects");
        var oldCodec = new NotificationPayloadCodec(new NotificationPayloadSealer("previous-secret"));
        var stale = NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET,
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, "https://vinnot.example/reset-password?token=OLD"), "ACCOUNT_PASSWORD_RESET:old");
        queue.enqueue("NOTIFICATION", "notification:ACCOUNT_PASSWORD_RESET:old", oldCodec.encode(stale), Duration.ZERO);
        notifications.enqueue(NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET,
                NotificationRecipient.address("bob@example.test", "Bob"), NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, "https://vinnot.example/reset-password?token=NEW"), "ACCOUNT_PASSWORD_RESET:new"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE payload::text LIKE '%token=%'", Integer.class))
                .isZero();
        worker.drain();
        verify(delivery).send(eq(NotificationType.ACCOUNT_PASSWORD_RESET), eq("bob@example.test"), any());
        assertThat(jdbc.queryForObject("SELECT attempts || ' ' || last_error_type FROM external_effects WHERE deduplication_key = ?",
                String.class, "notification:ACCOUNT_PASSWORD_RESET:old")).isEqualTo("1 IllegalStateException");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class,
                "notification:ACCOUNT_PASSWORD_RESET:new")).isZero();
        UUID unused = UUID.randomUUID();
        assertThat(unused).isNotNull();
    }
}
