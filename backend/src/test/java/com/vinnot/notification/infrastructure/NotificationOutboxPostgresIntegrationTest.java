package com.vinnot.notification.infrastructure;

import com.vinnot.notification.infrastructure.persistence.JdbcAnnouncementStats;
import com.vinnot.notification.infrastructure.persistence.JdbcNotificationPreferenceRepository;
import com.vinnot.notification.infrastructure.persistence.JdbcEmailSuppressionRepository;
import com.vinnot.notification.infrastructure.security.SealedUnsubscribeLinks;
import com.vinnot.notification.infrastructure.template.NewsletterTemplate;
import com.vinnot.notification.infrastructure.template.AnnouncementTestTemplate;
import com.vinnot.notification.infrastructure.template.ServiceNoticeTemplate;
import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.query.response.EventRegistrationNotice;
import com.vinnot.event.application.service.NotifyEventRegistrationService;
import com.vinnot.event.infrastructure.notification.EventRegistrationEffectHandler;
import com.vinnot.notification.application.model.RenderedNotification;
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
import com.vinnot.notification.infrastructure.outbox.OutboxPushAdapter;
import com.vinnot.notification.infrastructure.outbox.OutboxNotificationAdapter;
import com.vinnot.notification.infrastructure.persistence.JdbcNotificationRecipientDirectory;
import com.vinnot.notification.infrastructure.template.AccountEmailTemplates;
import com.vinnot.notification.infrastructure.template.EventRegistrationTemplates;
import com.vinnot.notification.infrastructure.template.NotificationTemplateRegistry;
import com.vinnot.notification.infrastructure.template.SupportRequestTemplate;
import com.vinnot.notification.infrastructure.template.WineSubmissionStatusTemplate;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import com.vinnot.shared.infrastructure.effects.DurableEffectWorker;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Runs the real outbox SQL, worker and templates; only the provider call is replaced. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false",
        "jwt.secret=integration-only", "app.auth.frontend-base-url=https://vinnot.example"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({DurableEffectQueue.class, DurableEffectWorker.class, ObjectMapper.class, EnqueueNotificationService.class,
        DeliverNotificationService.class, JdbcAnnouncementStats.class, OutboxAttempts.class,
        JdbcNotificationPreferenceRepository.class, JdbcEmailSuppressionRepository.class, SealedUnsubscribeLinks.class, NewsletterTemplate.class, ServiceNoticeTemplate.class, AnnouncementTestTemplate.class, OutboxNotificationAdapter.class, NotificationPayloadCodec.class,
        NotificationPayloadSealer.class, NotificationEffectHandler.class, NotificationTemplateRegistry.class,
        SupportRequestTemplate.class, WineSubmissionStatusTemplate.class, AccountEmailTemplates.class, BrandedEmailTemplate.class,
        JdbcNotificationRecipientDirectory.class, EventRegistrationTemplates.class, PaymentEmailTemplates.class, ModerationEmailTemplates.class, CommunityEmailTemplates.class, SupportEmailTemplates.class, EventRegistrationEffectHandler.class,
        NotifyEventRegistrationService.class, LegacyNotificationEffectHandler.class,
        NotificationRetention.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class NotificationOutboxPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired NotificationPort notifications;
    @Autowired DurableEffectWorker worker;
    @Autowired NotificationRetention retention;
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

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM external_effects");
        reset(delivery);
    }

    @Test
    void enqueueJoinsTheBusinessTransactionAndIgnoresARepeatedDedupeKey() {
        String id = UUID.randomUUID().toString();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            notifications.enqueue(support(id));
            status.setRollbackOnly();
        });
        assertThat(rows(id)).isZero();
        notifications.enqueue(support(id));
        notifications.enqueue(support(id));
        assertThat(rows(id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT kind FROM external_effects WHERE deduplication_key = ?", String.class, key(id)))
                .isEqualTo("NOTIFICATION");
    }

    @Test
    void theWorkerRendersDeliversAndRemovesTheMessage() {
        String id = UUID.randomUUID().toString();
        notifications.enqueue(support(id));
        worker.drain();
        var message = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery).send(eq(NotificationType.SUPPORT_REQUEST), eq("support@vinnot.example"), message.capture());
        assertThat(message.getValue().subject()).isEqualTo("Vinnot — support request");
        assertThat(message.getValue().replyTo()).isEqualTo("reply@example.org");
        assertThat(rows(id)).isZero();
    }

    @Test
    void aProviderOutageKeepsTheMessageForRetryWithoutAffectingTheCaller() {
        doThrow(new ExternalServiceUnavailableException("EMAIL_DELIVERY_FAILED", "down", null))
                .when(delivery).send(any(), any(), any());
        String id = UUID.randomUUID().toString();
        notifications.enqueue(support(id));
        worker.drain();
        assertThat(jdbc.queryForObject("SELECT attempts || ' ' || last_error_type FROM external_effects WHERE deduplication_key = ?",
                String.class, key(id))).isEqualTo("1 ExternalServiceUnavailableException");
    }

    @Test
    void userRecipientsAreResolvedAtDeliveryAndDroppedOnceTheAccountIsGone() {
        UUID user = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id, username, email, password, first_name, last_name, email_verified)"
                + " VALUES (?, ?, ?, 'hash', 'Ana', 'Pérez', true)", user, user.toString(), "ana-" + user + "@example.test");
        notifications.enqueue(submission(user, "first"));
        jdbc.update("UPDATE users SET email = ? WHERE id = ?", "current-" + user + "@example.test", user);
        worker.drain();
        var message = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery).send(eq(NotificationType.WINE_SUBMISSION_STATUS), eq("current-" + user + "@example.test"), message.capture());
        assertThat(message.getValue().text()).startsWith("Hola Ana Pérez,");
        reset(delivery);
        notifications.enqueue(submission(user, "second"));
        jdbc.update("DELETE FROM users WHERE id = ?", user);
        worker.drain();
        verify(delivery, never()).send(any(), any(), any());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class)).isZero();
    }

    @Test
    void triggerEnqueuedRegistrationChangesAreHandedToTheNotificationOutboxAndDeliveredInOneDrain() {
        UUID registration = UUID.randomUUID();
        when(notices.findCurrent(registration, 2L, false)).thenReturn(Optional.of(new EventRegistrationNotice(registration,
                UUID.randomUUID(), "guest@example.test", UUID.randomUUID(), "en", false, "Tasting", "CONFIRMED", "APPROVED", 2,
                Instant.parse("2026-10-20T12:00:00Z"), null, "Guest", null)));
        // Same kind, key and payload shape as the V35 trigger.
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload) VALUES (?, 'EVENT_REGISTRATION_CHANGED', ?,"
                + " jsonb_build_object('registrationId', ?::text, 'version', 2, 'recipient', 'ATTENDEE'))",
                UUID.randomUUID(), "event-registration:" + registration + ":2:ATTENDEE", registration.toString());
        worker.drain();
        var message = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery).send(eq(NotificationType.EVENT_REGISTRATION_ATTENDEE), eq("guest@example.test"), message.capture());
        assertThat(message.getValue().subject()).isEqualTo("Your Vinnot registration");
        assertThat(message.getValue().html()).contains("/my-tickets/" + registration, "View my ticket");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class)).isZero();
    }

    @Test
    void legacySupportRowsQueuedBeforeTheUpgradeAreDelivered() {
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload) VALUES (?, 'SUPPORT_REQUEST', 'support:legacy',"
                + " '{\"requestId\":\"legacy\",\"name\":\"Name\",\"email\":\"reply@example.org\",\"subject\":\"privacy\","
                + "\"message\":\"Hi\",\"recipient\":\"support@vinnot.example\"}')", UUID.randomUUID());
        worker.drain();
        verify(delivery).send(eq(NotificationType.SUPPORT_REQUEST), eq("support@vinnot.example"), any());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class)).isZero();
    }

    @Test
    void retentionDiscardsOnlyExpiredMessagesOfTypesThatLimitIt() {
        String old = UUID.randomUUID().toString();
        String fresh = UUID.randomUUID().toString();
        notifications.enqueue(support(old));
        notifications.enqueue(support(fresh));
        jdbc.update("UPDATE external_effects SET created_at = CURRENT_TIMESTAMP - INTERVAL '8 days' WHERE deduplication_key = ?", key(old));
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload, created_at) VALUES (?, 'avatar-cleanup', ?, '{}',"
                + " CURRENT_TIMESTAMP - INTERVAL '30 days')", UUID.randomUUID(), "other:" + old);
        retention.purgeExpired();
        assertThat(rows(old)).isZero();
        assertThat(rows(fresh)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class, "other:" + old))
                .isEqualTo(1);
    }

    @Test
    void retentionDiscardsExhaustedNotificationsOnlyAfterTheWindow() {
        String expired = UUID.randomUUID().toString();
        String recent = UUID.randomUUID().toString();
        String retrying = UUID.randomUUID().toString();
        for (String id : new String[] {expired, recent, retrying}) {
            notifications.enqueue(NotificationRequest.of(NotificationType.ACCOUNT_EMAIL_CHANGED,
                    NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.EN, Map.of(), "changed:" + id));
        }
        jdbc.update("UPDATE external_effects SET attempts = 10, created_at = CURRENT_TIMESTAMP - INTERVAL '31 days'"
                + " WHERE deduplication_key = ?", "notification:changed:" + expired);
        jdbc.update("UPDATE external_effects SET attempts = 10, created_at = CURRENT_TIMESTAMP - INTERVAL '29 days'"
                + " WHERE deduplication_key = ?", "notification:changed:" + recent);
        jdbc.update("UPDATE external_effects SET attempts = 9, created_at = CURRENT_TIMESTAMP - INTERVAL '31 days'"
                + " WHERE deduplication_key = ?", "notification:changed:" + retrying);
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload, attempts, created_at)"
                + " VALUES (?, 'avatar-cleanup', ?, '{}', 10, CURRENT_TIMESTAMP - INTERVAL '90 days')",
                UUID.randomUUID(), "other:" + expired);
        retention.purgeExpired();
        assertThat(changedRows(expired)).isZero();
        assertThat(changedRows(recent)).as("exhausted, inside the window").isEqualTo(1);
        assertThat(changedRows(retrying)).as("still has attempts left").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class,
                "other:" + expired)).as("other effects keep their own policy").isEqualTo(1);
    }

    @Test
    void retentionAlsoDiscardsExhaustedPushJobsOnlyAfterTheWindow() {
        String expired = pushJob(DurableEffectWorker.MAX_ATTEMPTS, 31);
        String recent = pushJob(DurableEffectWorker.MAX_ATTEMPTS, 29);
        String retrying = pushJob(DurableEffectWorker.MAX_ATTEMPTS - 1, 31);

        retention.purgeExpired();

        assertThat(pushRows(expired)).as("exhausted push past the window").isZero();
        assertThat(pushRows(recent)).as("exhausted, inside the window").isEqualTo(1);
        assertThat(pushRows(retrying)).as("still has attempts left").isEqualTo(1);
    }

    @Test
    void theWorkerAndTheRetentionShareTheAttemptLimitOfThePartialIndexes() {
        assertThat(indexDefinition("idx_external_effects_pending")).contains("(attempts < " + DurableEffectWorker.MAX_ATTEMPTS + ")");
        assertThat(indexDefinition("idx_external_effects_exhausted_notifications"))
                .contains("(attempts >= " + DurableEffectWorker.MAX_ATTEMPTS + ")");
    }

    private String pushJob(int attempts, int ageDays) {
        String key = "push:" + UUID.randomUUID();
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload, attempts, created_at)"
                + " VALUES (?, ?, ?, '{}', ?, CURRENT_TIMESTAMP - (? * INTERVAL '1 day'))",
                UUID.randomUUID(), OutboxPushAdapter.KIND, key, attempts, ageDays);
        return key;
    }

    private int pushRows(String key) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class, key);
    }

    private String indexDefinition(String name) {
        return jdbc.queryForObject("SELECT indexdef FROM pg_indexes WHERE indexname = ?", String.class, name);
    }

    private static NotificationRequest support(String id) {
        return NotificationRequest.of(NotificationType.SUPPORT_REQUEST, NotificationRecipient.address("support@vinnot.example", null),
                NotificationLocale.EN, Map.of("requestId", id, "name", "Name", "email", "reply@example.org", "subject", "privacy",
                        "message", "Hello"), "support:" + id);
    }

    private static NotificationRequest submission(UUID user, String transition) {
        return NotificationRequest.of(NotificationType.WINE_SUBMISSION_STATUS, NotificationRecipient.user(user), NotificationLocale.ES,
                Map.of("wineName", "Malbec", "status", "APPROVED", "reason", ""), "submission:" + user + ":" + transition);
    }

    private int rows(String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class, key(id));
    }

    private int changedRows(String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key = ?", Integer.class,
                "notification:changed:" + id);
    }

    private static String key(String id) {
        return "notification:support:" + id;
    }
}
