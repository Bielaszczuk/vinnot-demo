package com.vinnot.notification.infrastructure;

import com.vinnot.notification.infrastructure.persistence.JdbcAnnouncementStats;
import com.vinnot.notification.infrastructure.persistence.JdbcNotificationPreferenceRepository;
import com.vinnot.notification.infrastructure.persistence.JdbcEmailSuppressionRepository;
import com.vinnot.notification.infrastructure.security.SealedUnsubscribeLinks;
import com.vinnot.notification.infrastructure.template.NewsletterTemplate;
import com.vinnot.notification.infrastructure.template.AnnouncementTestTemplate;
import com.vinnot.notification.infrastructure.template.ServiceNoticeTemplate;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.application.service.DeliverNotificationService;
import com.vinnot.notification.application.service.EnqueueNotificationService;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.infrastructure.outbox.LegacyNotificationEffectHandler;
import com.vinnot.notification.infrastructure.outbox.NotificationEffectHandler;
import com.vinnot.notification.infrastructure.outbox.OutboxAttempts;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadCodec;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadSealer;
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
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.infrastructure.notification.EmailWineSubmissionNotificationAdapter;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;
import com.vinnot.notification.infrastructure.template.CommunityEmailTemplates;
import com.vinnot.notification.infrastructure.template.SupportEmailTemplates;
import com.vinnot.notification.infrastructure.template.ModerationEmailTemplates;
import com.vinnot.notification.infrastructure.template.PaymentEmailTemplates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

/** Wine submission emails through the real outbox, account lookup and templates; only the provider call is replaced. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false",
        "jwt.secret=integration-only", "app.auth.frontend-base-url=https://vinnot.example"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({DurableEffectQueue.class, DurableEffectWorker.class, ObjectMapper.class, EnqueueNotificationService.class,
        DeliverNotificationService.class, JdbcAnnouncementStats.class, OutboxAttempts.class,
        JdbcNotificationPreferenceRepository.class, JdbcEmailSuppressionRepository.class, SealedUnsubscribeLinks.class, NewsletterTemplate.class, ServiceNoticeTemplate.class, AnnouncementTestTemplate.class, OutboxNotificationAdapter.class, NotificationPayloadCodec.class,
        NotificationPayloadSealer.class, NotificationEffectHandler.class, NotificationTemplateRegistry.class,
        SupportRequestTemplate.class, WineSubmissionStatusTemplate.class, AccountEmailTemplates.class, BrandedEmailTemplate.class,
        EventRegistrationTemplates.class, PaymentEmailTemplates.class, ModerationEmailTemplates.class, CommunityEmailTemplates.class, SupportEmailTemplates.class, JdbcNotificationRecipientDirectory.class, LegacyNotificationEffectHandler.class,
        EmailWineSubmissionNotificationAdapter.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class WineSubmissionNotificationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired EmailWineSubmissionNotificationAdapter adapter;
    @Autowired DurableEffectWorker worker;
    @MockitoBean NotificationDeliveryPort delivery;

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
    void aSubmitterWhoPrefersEnglishGetsTheEmailInEnglish() {
        UUID user = user("en");
        adapter.notifyStatusChanged(approvedBy(user));
        RenderedNotification message = deliveredTo(user);
        assertThat(message.subject()).isEqualTo("Update on your wine proposal");
        assertThat(message.text()).startsWith("Hello Ana Pérez,\n\nThe status of your proposal Malbec is now \"Published\"."
                + " It passed the automatic validation.");
        assertThat(message.html()).contains("lang=\"en\"");
    }

    @Test
    void aSpanishSubmitterGetsSpanishCopyWithoutTheStoredEnglishSystemReason() {
        UUID user = user("es");
        adapter.notifyStatusChanged(approvedBy(user));
        RenderedNotification message = deliveredTo(user);
        assertThat(message.subject()).isEqualTo("Actualización de tu propuesta de vino");
        assertThat(message.text()).startsWith("Hola Ana Pérez,\n\nTu propuesta Malbec ahora tiene el estado «Publicado»."
                + " Pasó la validación automática.").doesNotContain("Automatically approved", "APPROVED");
    }

    @Test
    void legacyRowsWithARawStatusRenderReadableCopyInTheSubmittersLanguage() {
        UUID user = user("en");
        // Same kind and payload shape as the pre-notification-module producer.
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload) VALUES (?, 'submission-status', ?,"
                + " jsonb_build_object('userId', ?::text, 'wineName', 'Malbec', 'status', 'NEEDS_REVIEW', 'reason', 'Pending'))",
                UUID.randomUUID(), "submission:legacy:" + user, user.toString());
        RenderedNotification message = deliveredTo(user);
        assertThat(message.text()).contains("The status of your proposal Malbec is now \"Needs review\". Pending")
                .doesNotContain("NEEDS_REVIEW");
    }

    private RenderedNotification deliveredTo(UUID user) {
        worker.drain();
        var message = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery).send(eq(NotificationType.WINE_SUBMISSION_STATUS), eq("ana-" + user + "@example.test"), message.capture());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class)).isZero();
        return message.getValue();
    }

    private UUID user(String language) {
        UUID user = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id, username, email, password, first_name, last_name, email_verified, preferred_language)"
                + " VALUES (?, ?, ?, 'hash', 'Ana', 'Pérez', true, ?)", user, user.toString(), "ana-" + user + "@example.test",
                language);
        return user;
    }

    private static WineSubmission approvedBy(UUID user) {
        WineSubmission submission = WineSubmission.create(user, "Malbec", "Bodega Norte", "RED", 2022, List.of("Malbec"),
                "Argentina", "Mendoza", null, null);
        submission.approve(UUID.randomUUID(), "/label.jpg", 0.9);
        return submission;
    }
}
