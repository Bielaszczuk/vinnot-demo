package com.vinnot.user.application;

import com.vinnot.notification.infrastructure.persistence.JdbcNotificationPreferenceRepository;
import com.vinnot.notification.infrastructure.persistence.JdbcEmailSuppressionRepository;
import com.vinnot.notification.infrastructure.security.SealedUnsubscribeLinks;
import com.vinnot.notification.infrastructure.template.NewsletterTemplate;
import com.vinnot.notification.infrastructure.template.AnnouncementTestTemplate;
import com.vinnot.notification.infrastructure.template.ServiceNoticeTemplate;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.application.port.out.NotificationDeliveryPort;
import com.vinnot.notification.application.service.DeliverNotificationService;
import com.vinnot.notification.infrastructure.outbox.OutboxAttempts;
import com.vinnot.notification.infrastructure.persistence.JdbcAnnouncementStats;
import com.vinnot.notification.application.service.EnqueueNotificationService;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.infrastructure.outbox.NotificationEffectHandler;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadCodec;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadSealer;
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
import com.vinnot.user.application.command.handler.ConfirmEmailChangeCommandHandler;
import com.vinnot.user.application.command.handler.ForgotPasswordCommandHandler;
import com.vinnot.user.application.command.handler.RegisterUserCommandHandler;
import com.vinnot.user.application.command.handler.RequestEmailChangeCommandHandler;
import com.vinnot.user.application.command.model.ConfirmEmailChangeCommand;
import com.vinnot.user.application.command.model.ForgotPasswordCommand;
import com.vinnot.user.application.command.model.RegisterUserCommand;
import com.vinnot.user.application.command.model.RequestEmailChangeCommand;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.application.service.IssueAccountRecoveryService;
import com.vinnot.user.infrastructure.config.AccountActionTokenConfiguration;
import com.vinnot.user.infrastructure.identity.PasswordHashingAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.AccountDeletionIntegrity;
import com.vinnot.user.infrastructure.persistence.adapter.RefreshTokenPersistenceAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.UserActionTokenPersistenceAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.UserPersistenceAdapter;
import com.vinnot.user.infrastructure.recovery.AccountRecoveryEffectHandler;
import com.vinnot.user.infrastructure.recovery.OutboxAccountRecoveryAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
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

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.vinnot.notification.infrastructure.template.CommunityEmailTemplates;
import com.vinnot.notification.infrastructure.template.SupportEmailTemplates;
import com.vinnot.notification.infrastructure.template.ModerationEmailTemplates;
import com.vinnot.notification.infrastructure.template.PaymentEmailTemplates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

/** Issue #292: an email provider outage must never fail or roll back account flows. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false",
        "jwt.secret=integration-only", "app.auth.frontend-base-url=https://vinnot.example"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({RegisterUserCommandHandler.class, ForgotPasswordCommandHandler.class, RequestEmailChangeCommandHandler.class,
        ConfirmEmailChangeCommandHandler.class, RefreshTokenPersistenceAdapter.class, AccountActionTokenService.class,
        AccountActionTokenConfiguration.class, UserPersistenceAdapter.class, UserActionTokenPersistenceAdapter.class,
        AccountDeletionIntegrity.class, PasswordHashingAdapter.class, DurableEffectQueue.class, DurableEffectWorker.class,
        ObjectMapper.class, EnqueueNotificationService.class, DeliverNotificationService.class, JdbcAnnouncementStats.class, OutboxAttempts.class, JdbcNotificationPreferenceRepository.class, JdbcEmailSuppressionRepository.class, SealedUnsubscribeLinks.class, NewsletterTemplate.class, ServiceNoticeTemplate.class, AnnouncementTestTemplate.class, OutboxNotificationAdapter.class,
        NotificationPayloadCodec.class, NotificationPayloadSealer.class, NotificationEffectHandler.class,
        NotificationTemplateRegistry.class, AccountEmailTemplates.class, SupportRequestTemplate.class, EventRegistrationTemplates.class, PaymentEmailTemplates.class, ModerationEmailTemplates.class, CommunityEmailTemplates.class, SupportEmailTemplates.class,
        WineSubmissionStatusTemplate.class, BrandedEmailTemplate.class, JdbcNotificationRecipientDirectory.class,
        OutboxAccountRecoveryAdapter.class, AccountRecoveryEffectHandler.class, IssueAccountRecoveryService.class,
        AccountEmailOutagePostgresIntegrationTest.Encoder.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AccountEmailOutagePostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired RegisterUserCommandHandler register;
    @Autowired ForgotPasswordCommandHandler forgotPassword;
    @Autowired RequestEmailChangeCommandHandler requestEmailChange;
    @Autowired ConfirmEmailChangeCommandHandler confirmEmailChange;
    @Autowired DurableEffectWorker worker;
    @MockitoBean NotificationDeliveryPort delivery;
    @MockitoBean LegalAgreementUseCase legal;
    // Lockout counting and the security log have their own tests; here they only need to exist.
    @MockitoBean LoginAttemptPort loginAttempts;
    @MockitoBean SecurityEventRecorder securityEvents;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void providerIsDown() {
        doThrow(new ExternalServiceUnavailableException("EMAIL_DELIVERY_FAILED", "down", null))
                .when(delivery).send(any(), any(), any());
    }

    @Test
    void registrationCommitsAndKeepsTheVerificationEmailForRetry() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID user = register.execute(new RegisterUserCommand("outage" + suffix, "outage-" + suffix + "@example.test",
                "Str0ng!Passw0rd", "Ana", "Pérez"));
        worker.drain();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id = ?", Integer.class, user)).isEqualTo(1);
        assertThat(pendingAttempts("ACCOUNT_EMAIL_VERIFICATION", user)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_action_tokens WHERE user_id = ? AND used_at IS NULL",
                Integer.class, user)).isEqualTo(1);
    }

    @Test
    void forgotPasswordCommitsTheResetTokenAndNeverStoresTheLinkInClear() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID user = register.execute(new RegisterUserCommand("reset" + suffix, "reset-" + suffix + "@example.test",
                "Str0ng!Passw0rd", "Ana", "Pérez"));
        forgotPassword.execute(new ForgotPasswordCommand("reset-" + suffix + "@example.test"));
        // The recovery job issues the reset email; the second drain covers clock skew between JVM and database.
        worker.drain();
        worker.drain();
        assertThat(pendingAttempts("ACCOUNT_PASSWORD_RESET", user)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payload->'data'->>'actionUrl' FROM external_effects WHERE payload->>'type' = ?"
                + " AND payload->'recipient'->>'email' = ?", String.class, "ACCOUNT_PASSWORD_RESET", "reset-" + suffix + "@example.test"))
                .startsWith("v1:").doesNotContain("token=");
    }

    @Test
    void aFailedEmailChangedNoticeNeverRollsBackTheVerifiedChange() {
        // Issue #295: a failed notice to the previous address used to roll the confirmed change back.
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String previous = "old-" + suffix + "@example.test";
        String next = "new-" + suffix + "@example.test";
        UUID user = register.execute(new RegisterUserCommand("change" + suffix, previous, "Str0ng!Passw0rd", "Ana", "Pérez"));
        jdbc.update("""
                INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at)
                VALUES (nextval('refresh_tokens_id_seq'), ?, ?, CURRENT_TIMESTAMP + INTERVAL '1 day')
                """, user, "refresh-" + suffix);
        requestEmailChange.execute(new RequestEmailChangeCommand(user, next));
        worker.drain();
        long sessionVersion = jdbc.queryForObject("SELECT session_version FROM users WHERE id = ?", Long.class, user);

        confirmEmailChange.execute(new ConfirmEmailChangeCommand(attemptedToken(NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION, next)));
        worker.drain();

        assertThat(jdbc.queryForObject("SELECT email FROM users WHERE id = ?", String.class, user)).isEqualTo(next);
        assertThat(jdbc.queryForObject("SELECT session_version FROM users WHERE id = ?", Long.class, user)).isEqualTo(sessionVersion + 1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ?", Integer.class, user)).isZero();
        assertThat(jdbc.queryForObject("""
                SELECT attempts FROM external_effects WHERE kind = 'NOTIFICATION' AND payload->>'type' = 'ACCOUNT_EMAIL_CHANGED'
                AND payload->'recipient'->>'email' = ?
                """, Integer.class, previous)).isEqualTo(1);
    }

    /** The provider is down, but the attempted message still shows the link the user would have received. */
    private String attemptedToken(NotificationType type, String recipient) {
        ArgumentCaptor<RenderedNotification> messages = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery, atLeastOnce()).send(eq(type), eq(recipient), messages.capture());
        Matcher token = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(messages.getValue().text());
        assertThat(token.find()).isTrue();
        return token.group(1);
    }

    private int pendingAttempts(String type, UUID user) {
        return jdbc.queryForObject("""
                SELECT e.attempts FROM external_effects e JOIN users u ON u.email = e.payload->'recipient'->>'email'
                WHERE e.kind = 'NOTIFICATION' AND e.payload->>'type' = ? AND u.id = ?
                """, Integer.class, type, user);
    }

    @TestConfiguration
    static class Encoder {
        @Bean
        PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder(4);
        }
    }
}
