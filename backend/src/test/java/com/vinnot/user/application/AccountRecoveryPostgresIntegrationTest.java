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
import com.vinnot.notification.application.port.in.NotificationPort;
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
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import com.vinnot.shared.infrastructure.effects.DurableEffectWorker;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;
import com.vinnot.user.application.command.handler.ForgotPasswordCommandHandler;
import com.vinnot.user.application.command.handler.RegisterUserCommandHandler;
import com.vinnot.user.application.command.handler.ResendVerificationCommandHandler;
import com.vinnot.user.application.command.handler.ResetPasswordCommandHandler;
import com.vinnot.user.application.command.handler.VerifyEmailCommandHandler;
import com.vinnot.user.application.command.model.ForgotPasswordCommand;
import com.vinnot.user.application.command.model.RegisterUserCommand;
import com.vinnot.user.application.command.model.ResendVerificationCommand;
import com.vinnot.user.application.command.model.ResetPasswordCommand;
import com.vinnot.user.application.command.model.VerifyEmailCommand;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.application.service.IssueAccountRecoveryService;
import com.vinnot.user.infrastructure.config.AccountActionTokenConfiguration;
import com.vinnot.user.infrastructure.identity.PasswordHashingAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.AccountDeletionIntegrity;
import com.vinnot.user.infrastructure.persistence.adapter.RefreshTokenPersistenceAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.UserActionTokenPersistenceAdapter;
import com.vinnot.user.infrastructure.persistence.adapter.UserPersistenceAdapter;
import com.vinnot.user.infrastructure.recovery.AccountRecoveryEffectHandler;
import com.vinnot.user.infrastructure.recovery.AccountRecoveryRetention;
import com.vinnot.user.infrastructure.recovery.OutboxAccountRecoveryAdapter;
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
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.vinnot.notification.infrastructure.template.CommunityEmailTemplates;
import com.vinnot.notification.infrastructure.template.SupportEmailTemplates;
import com.vinnot.notification.infrastructure.template.ModerationEmailTemplates;
import com.vinnot.notification.infrastructure.template.PaymentEmailTemplates;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import com.vinnot.user.application.service.WelcomeEmailService;
import org.springframework.jdbc.core.RowCallbackHandler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

/** Issue #295: forgot password and resend verification must not reveal whether an account exists. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false",
        "jwt.secret=integration-only", "app.auth.frontend-base-url=https://vinnot.example"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({RegisterUserCommandHandler.class, ForgotPasswordCommandHandler.class, ResendVerificationCommandHandler.class,
        ResetPasswordCommandHandler.class, VerifyEmailCommandHandler.class, AccountSecurityNoticeService.class, WelcomeEmailService.class, AccountActionTokenService.class,
        AccountActionTokenConfiguration.class, UserPersistenceAdapter.class, UserActionTokenPersistenceAdapter.class,
        RefreshTokenPersistenceAdapter.class, AccountDeletionIntegrity.class, PasswordHashingAdapter.class,
        DurableEffectQueue.class, DurableEffectWorker.class, ObjectMapper.class, EnqueueNotificationService.class,
        DeliverNotificationService.class, JdbcAnnouncementStats.class, OutboxAttempts.class, JdbcNotificationPreferenceRepository.class, JdbcEmailSuppressionRepository.class, SealedUnsubscribeLinks.class, NewsletterTemplate.class, ServiceNoticeTemplate.class, AnnouncementTestTemplate.class, OutboxNotificationAdapter.class, NotificationPayloadCodec.class,
        NotificationPayloadSealer.class, NotificationEffectHandler.class, NotificationTemplateRegistry.class,
        AccountEmailTemplates.class, SupportRequestTemplate.class, EventRegistrationTemplates.class, PaymentEmailTemplates.class, ModerationEmailTemplates.class, CommunityEmailTemplates.class, SupportEmailTemplates.class,
        WineSubmissionStatusTemplate.class, BrandedEmailTemplate.class, JdbcNotificationRecipientDirectory.class,
        OutboxAccountRecoveryAdapter.class, AccountRecoveryEffectHandler.class, IssueAccountRecoveryService.class,
        AccountRecoveryRetention.class, AccountRecoveryPostgresIntegrationTest.Encoder.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AccountRecoveryPostgresIntegrationTest {
    private static final String PASSWORD = "Str0ng!Passw0rd";
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired RegisterUserCommandHandler register;
    @Autowired ForgotPasswordCommandHandler forgotPassword;
    @Autowired ResendVerificationCommandHandler resendVerification;
    @Autowired ResetPasswordCommandHandler resetPassword;
    @Autowired VerifyEmailCommandHandler verifyEmail;
    @Autowired DurableEffectWorker worker;
    @Autowired AccountRecoveryRetention retention;
    @MockitoSpyBean NotificationPort notifications;
    @MockitoBean NotificationDeliveryPort delivery;
    @MockitoBean LegalAgreementUseCase legal;
    // Lockout counting and the security log have their own tests; here they only need to exist.
    @MockitoBean LoginAttemptPort loginAttempts;
    @MockitoBean SecurityEventRecorder securityEvents;
    @MockitoBean ManagePushDevicesUseCase pushDevices;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void forgotPasswordDoesTheSameRequestWorkForExistingAndUnknownEmails() {
        String eligible = account("reset");
        jdbc.update("UPDATE users SET preferred_language = 'en' WHERE email = ?", eligible);
        String locked = account("locked");
        jdbc.update("UPDATE users SET locked = true WHERE email = ?", locked);
        String unknown = "nobody-" + UUID.randomUUID() + "@example.test";
        jdbc.update("DELETE FROM external_effects");

        Map<String, Long> existingWrites = requestWrites(() -> forgotPassword.execute(new ForgotPasswordCommand(eligible)));
        Map<String, Long> lockedWrites = requestWrites(() -> forgotPassword.execute(new ForgotPasswordCommand(locked)));
        Map<String, Long> unknownWrites = requestWrites(() -> forgotPassword.execute(new ForgotPasswordCommand(unknown)));

        assertThat(existingWrites).isEqualTo(unknownWrites).isEqualTo(lockedWrites)
                .isEqualTo(Map.of("external_effects:ACCOUNT_RECOVERY_REQUESTED", 1L));
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM external_effects WHERE kind = 'ACCOUNT_RECOVERY_REQUESTED'
                AND deduplication_key ~ '^account-recovery:[0-9a-f-]{36}$' AND payload - 'action' - 'email' = '{}'::jsonb
                """, Integer.class)).as("random keys, payload limited to action and address").isEqualTo(3);
        drainEverything();
        verify(delivery, never()).send(any(), eq(unknown), any());
        verify(delivery, never()).send(any(), eq(locked), any());
        RenderedNotification email = delivered(NotificationType.ACCOUNT_PASSWORD_RESET, eligible);
        assertThat(email.subject()).isEqualTo("Reset your Vinnot password");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class)).isZero();

        String hashBefore = jdbc.queryForObject("SELECT password FROM users WHERE email = ?", String.class, eligible);
        resetPassword.execute(new ResetPasswordCommand(token(email), "An0ther!Passw0rd"));
        assertThat(jdbc.queryForObject("SELECT password FROM users WHERE email = ?", String.class, eligible)).isNotEqualTo(hashBefore);
    }

    @Test
    void resendVerificationDoesTheSameRequestWorkForExistingAndUnknownEmails() {
        String pending = account("pending");
        String verified = account("verified");
        jdbc.update("UPDATE users SET email_verified = true WHERE email = ?", verified);
        String unknown = "nobody-" + UUID.randomUUID() + "@example.test";
        jdbc.update("DELETE FROM external_effects");

        Map<String, Long> existingWrites = requestWrites(() -> resendVerification.execute(new ResendVerificationCommand(pending)));
        Map<String, Long> verifiedWrites = requestWrites(() -> resendVerification.execute(new ResendVerificationCommand(verified)));
        Map<String, Long> unknownWrites = requestWrites(() -> resendVerification.execute(new ResendVerificationCommand(unknown)));

        assertThat(existingWrites).isEqualTo(unknownWrites).isEqualTo(verifiedWrites)
                .isEqualTo(Map.of("external_effects:ACCOUNT_RECOVERY_REQUESTED", 1L));
        drainEverything();
        verify(delivery, never()).send(any(), eq(unknown), any());
        verify(delivery, never()).send(any(), eq(verified), any());
        RenderedNotification email = delivered(NotificationType.ACCOUNT_EMAIL_VERIFICATION, pending);
        assertThat(email.subject()).isEqualTo("Verifica tu cuenta de Vinnot");

        verifyEmail.execute(new VerifyEmailCommand(token(email)));
        assertThat(jdbc.queryForObject("SELECT email_verified FROM users WHERE email = ?", Boolean.class, pending)).isTrue();
    }

    @Test
    void aFailedRecoveryRollsBackItsLinkAndIsRetried() {
        String eligible = account("retry");
        jdbc.update("DELETE FROM external_effects");
        doThrow(new IllegalStateException("outbox unavailable")).when(notifications).enqueue(any());

        forgotPassword.execute(new ForgotPasswordCommand(eligible));
        worker.drain();

        assertThat(resetTokens(eligible)).as("token rolled back with its email").isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE kind = 'NOTIFICATION'", Integer.class)).isZero();
        assertThat(jdbc.queryForMap("SELECT attempts, last_error_type FROM external_effects WHERE kind = 'ACCOUNT_RECOVERY_REQUESTED'"))
                .containsEntry("attempts", 1).containsEntry("last_error_type", "IllegalStateException");

        reset(notifications);
        jdbc.update("UPDATE external_effects SET next_attempt_at = CURRENT_TIMESTAMP - INTERVAL '1 second'");
        drainEverything();

        assertThat(resetTokens(eligible)).isEqualTo(1);
        delivered(NotificationType.ACCOUNT_PASSWORD_RESET, eligible);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class)).isZero();
    }

    @Test
    void discardsRecoveryRequestsTheWorkerCouldNotProcessWithinADay() {
        jdbc.update("DELETE FROM external_effects");
        forgotPassword.execute(new ForgotPasswordCommand("stale@example.test"));
        jdbc.update("UPDATE external_effects SET created_at = CURRENT_TIMESTAMP - INTERVAL '25 hours'");
        forgotPassword.execute(new ForgotPasswordCommand("fresh@example.test"));
        jdbc.update("""
                INSERT INTO external_effects(id, kind, deduplication_key, payload, created_at)
                VALUES (?, 'OTHER_EFFECT', ?, '{}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '25 hours')
                """, UUID.randomUUID(), "other:" + UUID.randomUUID());

        retention.purgeExpired();

        assertThat(jdbc.queryForList("SELECT COALESCE(payload->>'email', kind) FROM external_effects ORDER BY 1", String.class))
                .containsExactly("OTHER_EFFECT", "fresh@example.test");
    }

    @Test
    void aDatabaseErrorWhileIssuingTheLinkIsCountedAndDoesNotBlockLaterEffects() {
        String eligible = account("dbfail");
        jdbc.update("DELETE FROM external_effects");
        jdbc.execute("CREATE OR REPLACE FUNCTION test_fail_token_insert() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN RAISE EXCEPTION 'token insert failed'; END $$");
        jdbc.execute("CREATE TRIGGER test_fail_token_insert BEFORE INSERT ON user_action_tokens "
                + "FOR EACH ROW EXECUTE FUNCTION test_fail_token_insert()");
        try {
            forgotPassword.execute(new ForgotPasswordCommand(eligible));
            jdbc.update("UPDATE external_effects SET next_attempt_at = CURRENT_TIMESTAMP - INTERVAL '10 seconds'");
            forgotPassword.execute(new ForgotPasswordCommand("nobody-" + UUID.randomUUID() + "@example.test"));
            jdbc.update("""
                    UPDATE external_effects SET next_attempt_at = CURRENT_TIMESTAMP - INTERVAL '5 seconds'
                    WHERE attempts = 0 AND next_attempt_at > CURRENT_TIMESTAMP - INTERVAL '6 seconds'
                    """);

            worker.drain();

            assertThat(jdbc.queryForMap(
                    "SELECT attempts, last_error_type FROM external_effects WHERE payload->>'email' = ?", eligible))
                    .containsEntry("attempts", 1).extractingByKey("last_error_type").isNotNull();
            assertThat(resetTokens(eligible)).as("no partial token").isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects", Integer.class))
                    .as("the later job still ran and nothing partial was queued").isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT next_attempt_at > CURRENT_TIMESTAMP + INTERVAL '20 seconds' "
                    + "FROM external_effects", Boolean.class)).as("the failed job backs off").isTrue();
        } finally {
            jdbc.execute("DROP TRIGGER test_fail_token_insert ON user_action_tokens");
            jdbc.execute("DROP FUNCTION test_fail_token_insert()");
        }
    }

    private int resetTokens(String email) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM user_action_tokens t JOIN users u ON u.id = t.user_id
                WHERE u.email = ? AND t.token_type = 'PASSWORD_RESET'
                """, Integer.class, email);
    }

    private String account(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = prefix + "-" + suffix + "@example.test";
        register.execute(new RegisterUserCommand(prefix + suffix, email, PASSWORD, "Ana", "Pérez"));
        return email;
    }

    /** Rows each table gained or lost while the request ran, so two requests can be compared. */
    private Map<String, Long> requestWrites(Runnable request) {
        Map<String, Long> before = snapshot();
        request.run();
        Map<String, Long> after = snapshot();
        Map<String, Long> changes = new TreeMap<>();
        after.forEach((key, value) -> {
            long delta = value - before.getOrDefault(key, 0L);
            if (delta != 0) {
                changes.put(key, delta);
            }
        });
        before.keySet().stream().filter(key -> !after.containsKey(key)).forEach(key -> changes.put(key, -before.get(key)));
        return changes;
    }

    private Map<String, Long> snapshot() {
        Map<String, Long> counts = new TreeMap<>();
        counts.put("users", jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class));
        counts.put("users:updated", jdbc.queryForObject("SELECT COALESCE(SUM(EXTRACT(EPOCH FROM updated_at)), 0)::bigint FROM users", Long.class));
        counts.put("user_action_tokens", jdbc.queryForObject("SELECT COUNT(*) FROM user_action_tokens", Long.class));
        counts.put("user_action_tokens:used", jdbc.queryForObject("SELECT COUNT(*) FROM user_action_tokens WHERE used_at IS NOT NULL", Long.class));
        jdbc.query("SELECT kind, COUNT(*) AS rows FROM external_effects GROUP BY kind",
                (RowCallbackHandler) rs -> counts.put("external_effects:" + rs.getString("kind"), rs.getLong("rows")));
        return counts;
    }

    /** A recovery job hands its email to the outbox; a second drain covers clock skew between JVM and database. */
    private void drainEverything() {
        worker.drain();
        worker.drain();
    }

    private RenderedNotification delivered(NotificationType type, String recipient) {
        ArgumentCaptor<RenderedNotification> messages = ArgumentCaptor.forClass(RenderedNotification.class);
        verify(delivery).send(eq(type), eq(recipient), messages.capture());
        return messages.getValue();
    }

    private static String token(RenderedNotification email) {
        Matcher token = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(email.text());
        assertThat(token.find()).isTrue();
        return token.group(1);
    }

    @TestConfiguration
    static class Encoder {
        @Bean
        PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder(4);
        }
    }
}
