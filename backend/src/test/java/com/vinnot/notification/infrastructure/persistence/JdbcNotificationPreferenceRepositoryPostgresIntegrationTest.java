package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationPreferences.Choice;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.vinnot.notification.domain.model.NotificationCategory.COMMUNITY;
import static com.vinnot.notification.domain.model.NotificationCategory.NEWSLETTER;
import static com.vinnot.notification.domain.model.NotificationCategory.REMINDERS;
import static com.vinnot.notification.domain.model.NotificationChannel.EMAIL;
import static com.vinnot.notification.domain.model.NotificationChannel.PUSH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
class JdbcNotificationPreferenceRepositoryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static JdbcNotificationPreferenceRepository repository;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        repository = new JdbcNotificationPreferenceRepository(jdbc);
    }

    @Test
    void storesChoicesPerCategoryAndChannelAndOverwritesThem() {
        UUID user = user();
        Instant at = Instant.parse("2026-10-19T12:00:00Z");
        repository.saveChoices(user, Map.of(new Choice(COMMUNITY, EMAIL), false, new Choice(COMMUNITY, PUSH), true), at);
        repository.saveChoices(user, Map.of(new Choice(COMMUNITY, EMAIL), true), at.plusSeconds(60));

        var loaded = repository.load(user);

        assertThat(loaded.choices()).containsExactlyInAnyOrderEntriesOf(Map.of(
                new Choice(COMMUNITY, EMAIL), true, new Choice(COMMUNITY, PUSH), true));
        assertThat(loaded.marketingConsent()).isEqualTo(MarketingConsent.none());
        assertThat(repository.load(user()).choices()).as("another user").isEmpty();
    }

    @Test
    void storesAReminderChoice() {
        UUID user = user();

        repository.saveChoices(user, Map.of(new Choice(REMINDERS, PUSH), false), Instant.parse("2026-10-20T12:00:00Z"));

        assertThat(repository.load(user).choices()).containsExactlyEntriesOf(Map.of(new Choice(REMINDERS, PUSH), false));
    }

    @Test
    void theLatestConsentDecisionWinsAndTheHistoryIsAppendOnly() {
        UUID user = user();
        Instant granted = Instant.parse("2026-10-19T12:00:00Z");
        repository.recordConsent(user, true, ConsentSource.WEB, granted);
        repository.recordConsent(user, false, ConsentSource.MOBILE, granted.plusSeconds(3600));
        repository.saveChoices(user, Map.of(new Choice(NEWSLETTER, EMAIL), true), granted);

        assertThat(repository.load(user).marketingConsent()).isEqualTo(
                new MarketingConsent(false, granted.plusSeconds(3600), ConsentSource.MOBILE));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM marketing_consent_events WHERE user_id = ?",
                Integer.class, user)).isEqualTo(2);
        assertThatThrownBy(() -> jdbc.update("UPDATE marketing_consent_events SET granted = true WHERE user_id = ?", user))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("append-only");
    }

    @Test
    void loadingManyAccountsAtOnceMatchesLoadingEachOne() {
        UUID chose = user();
        UUID consented = user();
        UUID untouched = user();
        Instant at = Instant.parse("2026-10-19T12:00:00Z");
        repository.saveChoices(chose, Map.of(new Choice(COMMUNITY, PUSH), false, new Choice(NEWSLETTER, PUSH), true), at);
        repository.recordConsent(consented, true, ConsentSource.WEB, at);
        repository.recordConsent(consented, false, ConsentSource.MOBILE, at.plusSeconds(60));

        var loaded = repository.loadAll(List.of(chose, consented, untouched));

        assertThat(loaded).containsOnlyKeys(chose, consented, untouched);
        for (UUID user : List.of(chose, consented, untouched)) {
            assertThat(loaded.get(user)).as(user.toString()).isEqualTo(repository.load(user));
        }
        assertThat(loaded.get(consented).marketingConsent()).isEqualTo(new MarketingConsent(false, at.plusSeconds(60), ConsentSource.MOBILE));
        assertThat(repository.loadAll(List.of())).isEmpty();
    }

    @Test
    void transactionalCategoriesCannotBeStored() {
        UUID user = user();
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO notification_preferences (user_id, category, channel, enabled) VALUES (?, 'SECURITY', 'EMAIL', false)",
                user)).isInstanceOf(DataAccessException.class);
    }

    @Test
    void deletingAnAccountDeletesItsPreferencesAndConsentHistory() {
        UUID user = user();
        repository.saveChoices(user, Map.of(new Choice(COMMUNITY, EMAIL), false), Instant.now());
        repository.recordConsent(user, true, ConsentSource.MOBILE, Instant.now());

        jdbc.update("DELETE FROM users WHERE id = ?", user);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM notification_preferences WHERE user_id = ?", Integer.class, user)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM marketing_consent_events WHERE user_id = ?", Integer.class, user)).isZero();
    }

    @Test
    void choicesForAnAccountThatNoLongerExistsAreIgnored() {
        UUID deleted = UUID.randomUUID();

        repository.saveChoices(deleted, Map.of(new Choice(NEWSLETTER, EMAIL), false), Instant.now());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM notification_preferences WHERE user_id = ?", Integer.class, deleted)).isZero();
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
