package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Minimum app versions with their audit (V69), against the real schema. */
@Testcontainers(disabledWithoutDocker = true)
class JdbcAppMinimumVersionsPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-10-26T12:00:00Z").truncatedTo(ChronoUnit.SECONDS);
    private static JdbcTemplate jdbc;
    private static TransactionTemplate transactions;
    private static JdbcAppMinimumVersions versions;
    private AppMinimumVersionPort.Actor actor;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        versions = new JdbcAppMinimumVersions(jdbc);
    }

    @BeforeEach
    void freshTablesAndAnAdministrator() {
        jdbc.update("DELETE FROM app_minimum_version_changes");
        jdbc.update("DELETE FROM app_minimum_versions");
        UUID admin = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, email, username, password, first_name, last_name) VALUES (?, ?, ?, 'hash', 'A', 'B')",
                admin, "admin-" + admin + "@vinnot.test", "admin-" + admin);
        actor = new AppMinimumVersionPort.Actor(admin, "admin@vinnot.test");
    }

    @Test
    void aMissingRowMeansNoMinimumAndOnlyRealChangesAreAudited() {
        assertThat(versions.minimumVersions()).isEmpty();
        assertThat(versions.settings()).isEmpty();

        assertThat(versions.change(AppPlatform.IOS, null, actor, NOW)).as("clearing nothing").isEmpty();
        assertThat(versions.recentChanges(10)).as("an unchanged value records nothing").isEmpty();
        assertThat(versions.settings().get(AppPlatform.IOS))
                .isEqualTo(new AppMinimumVersionPort.Setting(AppPlatform.IOS, null, null, null));

        assertThat(versions.change(AppPlatform.IOS, AppVersion.parse("0.3.0"), actor, NOW)).isEmpty();
        assertThat(versions.change(AppPlatform.IOS, AppVersion.parse("0.3.0"), actor, NOW.plusSeconds(1))).contains(AppVersion.parse("0.3.0"));
        assertThat(versions.change(AppPlatform.IOS, AppVersion.parse("0.10.0"), actor, NOW.plusSeconds(2))).contains(AppVersion.parse("0.3.0"));
        assertThat(versions.change(AppPlatform.ANDROID, AppVersion.parse("0.2.0"), actor, NOW.plusSeconds(3))).isEmpty();
        assertThat(versions.change(AppPlatform.ANDROID, null, actor, NOW.plusSeconds(4))).contains(AppVersion.parse("0.2.0"));

        assertThat(versions.minimumVersions()).isEqualTo(Map.of(AppPlatform.IOS, AppVersion.parse("0.10.0")));
        assertThat(versions.settings()).containsEntry(AppPlatform.IOS, new AppMinimumVersionPort.Setting(AppPlatform.IOS,
                AppVersion.parse("0.10.0"), NOW.plusSeconds(2), "admin@vinnot.test"));
        assertThat(versions.settings()).containsEntry(AppPlatform.ANDROID, new AppMinimumVersionPort.Setting(AppPlatform.ANDROID,
                null, NOW.plusSeconds(4), "admin@vinnot.test"));
        assertThat(jdbc.queryForObject("SELECT updated_by FROM app_minimum_versions WHERE platform = 'IOS'", UUID.class))
                .isEqualTo(actor.id());
        assertThat(versions.recentChanges(3)).as("newest first, limited").containsExactly(
                new AppMinimumVersionPort.Change(AppPlatform.ANDROID, AppVersion.parse("0.2.0"), null, "admin@vinnot.test", NOW.plusSeconds(4)),
                new AppMinimumVersionPort.Change(AppPlatform.ANDROID, null, AppVersion.parse("0.2.0"), "admin@vinnot.test", NOW.plusSeconds(3)),
                new AppMinimumVersionPort.Change(AppPlatform.IOS, AppVersion.parse("0.3.0"), AppVersion.parse("0.10.0"), "admin@vinnot.test",
                        NOW.plusSeconds(2)));
        assertThat(versions.recentChanges(10)).hasSize(4);

        jdbc.update("DELETE FROM users WHERE id = ?", actor.id());
        assertThat(versions.settings().get(AppPlatform.IOS).updatedBy()).as("the audit outlives the account")
                .isEqualTo("admin@vinnot.test");
        assertThat(versions.recentChanges(1)).extracting(AppMinimumVersionPort.Change::changedBy).containsExactly("admin@vinnot.test");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_minimum_versions WHERE updated_by IS NOT NULL", Integer.class)).isZero();
    }

    @Test
    void platformsThisBinaryDoesNotKnowAreLeftOutAndMalformedVersionsCannotBeStored() {
        jdbc.update("INSERT INTO app_minimum_versions(platform, minimum_version) VALUES ('WINDOWS', '1.0.0')");
        jdbc.update("""
                INSERT INTO app_minimum_version_changes(platform, minimum_version, changed_by_email, changed_at)
                VALUES ('WINDOWS', '1.0.0', 'admin@vinnot.test', now())
                """);
        assertThat(versions.minimumVersions()).isEmpty();
        assertThat(versions.settings()).isEmpty();
        assertThat(versions.recentChanges(10)).isEmpty();
        assertThatThrownBy(() -> jdbc.update("INSERT INTO app_minimum_versions(platform, minimum_version) VALUES ('IOS', '1.2')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void concurrentChangesOfOnePlatformAreSerializedOnItsRow() throws Exception {
        CountDownLatch firstChanged = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        var first = CompletableFuture.runAsync(() -> transactions.executeWithoutResult(status -> {
            versions.change(AppPlatform.IOS, AppVersion.parse("0.3.0"), actor, NOW);
            firstChanged.countDown();
            await(releaseFirst);
        }));
        assertThat(firstChanged.await(10, TimeUnit.SECONDS)).isTrue();
        var second = CompletableFuture.supplyAsync(() -> transactions.execute(status ->
                versions.change(AppPlatform.IOS, AppVersion.parse("0.4.0"), actor, NOW.plusSeconds(1))));

        Thread.sleep(300);
        assertThat(second).as("waits for the first change's row lock").isNotDone();
        releaseFirst.countDown();
        first.get(10, TimeUnit.SECONDS);

        assertThat(second.get(10, TimeUnit.SECONDS)).as("sees the committed first change").isEqualTo(Optional.of(AppVersion.parse("0.3.0")));
        assertThat(versions.recentChanges(10)).extracting(change -> change.previousMinimumVersion() + "->" + change.minimumVersion())
                .containsExactly("0.3.0->0.4.0", "null->0.3.0");
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }
}
