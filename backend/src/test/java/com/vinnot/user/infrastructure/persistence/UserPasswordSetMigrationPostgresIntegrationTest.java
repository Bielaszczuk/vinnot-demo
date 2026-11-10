package com.vinnot.user.infrastructure.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V62 records whether each existing account has a password its owner chose (#345 B2). Accounts created by a social
 * sign-in got an unusable random password in the same transaction as their first identity; they only have a real
 * one if they later used a password reset link. A local account linked later keeps its password only if it had proven
 * its email before the link, because linking revokes an unproven one. Requesting a new token invalidates the earlier
 * unused one, which therefore does not count as used.
 */
@Testcontainers(disabledWithoutDocker = true)
class UserPasswordSetMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant CREATED = Instant.parse("2026-03-01T12:00:00Z");
    private static JdbcTemplate jdbc;
    private static final UUID LOCAL = UUID.randomUUID();
    private static final UUID LINKED_LATER = UUID.randomUUID();
    private static final UUID SOCIAL = UUID.randomUUID();
    private static final UUID SOCIAL_WITH_UNUSED_RESET = UUID.randomUUID();
    private static final UUID SOCIAL_THEN_RESET = UUID.randomUUID();
    private static final UUID SOCIAL_TWO_RESET_REQUESTS = UUID.randomUUID();
    private static final UUID UNVERIFIED_LINKED = UUID.randomUUID();
    private static final UUID UNVERIFIED_LINKED_THEN_RESET = UUID.randomUUID();
    private static final UUID VERIFIED_LINKED = UUID.randomUUID();
    private static final UUID VERIFIED_BY_EMAIL_CHANGE_LINKED = UUID.randomUUID();

    @BeforeAll
    static void migrateExistingAccounts() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("61").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        // Accounts after V5 ran: V5 verified every earlier account in bulk.
        Instant recent = Instant.now().plus(Duration.ofDays(1));
        user(LOCAL);
        user(LINKED_LATER);
        identity(LINKED_LATER, "GOOGLE", CREATED.plus(Duration.ofDays(10)));
        user(SOCIAL);
        identity(SOCIAL, "GOOGLE", CREATED.plusMillis(40));
        user(SOCIAL_WITH_UNUSED_RESET);
        identity(SOCIAL_WITH_UNUSED_RESET, "APPLE", CREATED.plusMillis(25));
        resetToken(SOCIAL_WITH_UNUSED_RESET, null);
        user(SOCIAL_THEN_RESET);
        identity(SOCIAL_THEN_RESET, "GOOGLE", CREATED.plusMillis(30));
        resetToken(SOCIAL_THEN_RESET, CREATED.plus(Duration.ofDays(2)));
        user(SOCIAL_TWO_RESET_REQUESTS);
        identity(SOCIAL_TWO_RESET_REQUESTS, "GOOGLE", CREATED.plusMillis(35));
        Instant firstRequest = CREATED.plus(Duration.ofDays(1));
        Instant secondRequest = firstRequest.plus(Duration.ofHours(1));
        token(SOCIAL_TWO_RESET_REQUESTS, "PASSWORD_RESET", firstRequest, secondRequest);
        token(SOCIAL_TWO_RESET_REQUESTS, "PASSWORD_RESET", secondRequest.plusMillis(3), null);
        user(UNVERIFIED_LINKED, recent);
        identity(UNVERIFIED_LINKED, "GOOGLE", recent.plus(Duration.ofDays(3)));
        user(UNVERIFIED_LINKED_THEN_RESET, recent);
        identity(UNVERIFIED_LINKED_THEN_RESET, "GOOGLE", recent.plus(Duration.ofDays(3)));
        token(UNVERIFIED_LINKED_THEN_RESET, "PASSWORD_RESET", recent.plus(Duration.ofDays(4)),
                recent.plus(Duration.ofDays(4)).plus(Duration.ofMinutes(5)));
        user(VERIFIED_LINKED, recent);
        token(VERIFIED_LINKED, "EMAIL_VERIFICATION", recent, recent.plus(Duration.ofHours(1)));
        identity(VERIFIED_LINKED, "APPLE", recent.plus(Duration.ofDays(3)));
        user(VERIFIED_BY_EMAIL_CHANGE_LINKED, recent);
        token(VERIFIED_BY_EMAIL_CHANGE_LINKED, "EMAIL_CHANGE", recent, recent.plus(Duration.ofHours(2)));
        identity(VERIFIED_BY_EMAIL_CHANGE_LINKED, "GOOGLE", recent.plus(Duration.ofDays(3)));
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
    }

    @Test
    void accountsCreatedBySocialSignInHaveNoPasswordUntilTheyResetIt() {
        assertThat(passwordSet(SOCIAL)).isFalse();
        assertThat(passwordSet(SOCIAL_WITH_UNUSED_RESET)).isFalse();
        assertThat(passwordSet(SOCIAL_THEN_RESET)).isTrue();
    }

    @Test
    void aResetRequestReplacedByANewerOneDoesNotCountAsUsed() {
        assertThat(passwordSet(SOCIAL_TWO_RESET_REQUESTS)).isFalse();
    }

    @Test
    void anUnverifiedLocalAccountLinkedLaterLostItsPasswordUntilItResetsIt() {
        assertThat(passwordSet(UNVERIFIED_LINKED)).isFalse();
        assertThat(passwordSet(UNVERIFIED_LINKED_THEN_RESET)).isTrue();
    }

    @Test
    void aLocalAccountThatProvedItsEmailBeforeTheLinkKeepsItsPassword() {
        assertThat(passwordSet(VERIFIED_LINKED)).isTrue();
        assertThat(passwordSet(VERIFIED_BY_EMAIL_CHANGE_LINKED)).isTrue();
    }

    @Test
    void localAccountsKeepTheirPasswordEvenWhenLinkedToAProviderLater() {
        assertThat(passwordSet(LOCAL)).isTrue();
        assertThat(passwordSet(LINKED_LATER)).isTrue();
    }

    @Test
    void newRowsDefaultToAChosenPassword() {
        UUID created = UUID.randomUUID();
        user(created);

        assertThat(passwordSet(created)).isTrue();
    }

    private static boolean passwordSet(UUID user) {
        return jdbc.queryForObject("SELECT password_set FROM users WHERE id = ?", Boolean.class, user);
    }

    private static void user(UUID id) {
        user(id, CREATED);
    }

    private static void user(UUID id, Instant createdAt) {
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active,created_at,updated_at)"
                        + " VALUES (?,?,?,'hash','Test','Member',true,?,?)",
                id, "user-" + id, id + "@example.invalid", Timestamp.from(createdAt), Timestamp.from(createdAt));
    }

    private static void identity(UUID user, String provider, Instant createdAt) {
        jdbc.update("INSERT INTO social_identities(id,user_id,provider,provider_subject,provider_email,created_at,updated_at)"
                        + " VALUES (?,?,?,?,?,?,?)", UUID.randomUUID(), user, provider, "subject-" + user,
                user + "@example.invalid", Timestamp.from(createdAt), Timestamp.from(createdAt));
    }

    private static void resetToken(UUID user, Instant usedAt) {
        token(user, "PASSWORD_RESET", CREATED.plus(Duration.ofDays(1)), usedAt);
    }

    private static void token(UUID user, String type, Instant createdAt, Instant usedAt) {
        jdbc.update("INSERT INTO user_action_tokens(id,user_id,token_type,token_hash,expires_at,used_at,created_at)"
                        + " VALUES (?,?,?,?,?,?,?)", UUID.randomUUID(), user, type,
                UUID.randomUUID().toString().replace("-", ""), Timestamp.from(createdAt.plus(Duration.ofDays(2))),
                Objects.isNull(usedAt) ? null : Timestamp.from(usedAt), Timestamp.from(createdAt));
    }
}
