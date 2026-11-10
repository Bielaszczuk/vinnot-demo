package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushPlatform;
import com.vinnot.notification.domain.model.PushToken;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class JdbcPushDeviceRepositoryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.MICROS);
    private static JdbcTemplate jdbc;
    private static JdbcPushDeviceRepository repository;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        repository = new JdbcPushDeviceRepository(jdbc);
    }

    @Test
    void aTokenSignedInWithAnotherAccountMovesToItAndIsRefreshed() {
        UUID first = user();
        UUID second = user();
        var token = new PushToken("ExponentPushToken[moving]");
        repository.save(new PushDevice(first, token, PushPlatform.IOS, NotificationLocale.ES, NOW));
        repository.save(new PushDevice(second, token, PushPlatform.IOS, NotificationLocale.EN, NOW.plusSeconds(60)));

        assertThat(repository.findByUsers(List.of(first))).isEmpty();
        assertThat(repository.findByUsers(List.of(first, second))).containsExactly(
                new PushDevice(second, token, PushPlatform.IOS, NotificationLocale.EN, NOW.plusSeconds(60)));
    }

    @Test
    void deletesOneDeviceOnlyForItsAccountAllDevicesOrReportedTokens() {
        UUID owner = user();
        UUID other = user();
        repository.save(new PushDevice(owner, new PushToken("ExpoPushToken[a]"), PushPlatform.ANDROID, NotificationLocale.ES, NOW));
        repository.save(new PushDevice(owner, new PushToken("ExpoPushToken[b]"), PushPlatform.ANDROID, NotificationLocale.ES, NOW));
        repository.save(new PushDevice(other, new PushToken("ExpoPushToken[c]"), PushPlatform.IOS, NotificationLocale.ES, NOW));

        repository.delete(other, new PushToken("ExpoPushToken[a]"));
        assertThat(tokens(owner)).containsExactlyInAnyOrder("ExpoPushToken[a]", "ExpoPushToken[b]");
        repository.deleteTokens(List.of("ExpoPushToken[a]", "ExpoPushToken[unknown]"));
        assertThat(tokens(owner)).containsExactly("ExpoPushToken[b]");
        repository.deleteAll(owner);
        assertThat(tokens(owner)).isEmpty();
        assertThat(tokens(other)).containsExactly("ExpoPushToken[c]");
        repository.deleteTokens(List.of());
    }

    @Test
    void registeringAgainRefreshesLastSeenAndChannelSupport() {
        UUID owner = user();
        var token = new PushToken("ExpoPushToken[fresh]");
        repository.save(new PushDevice(owner, token, PushPlatform.ANDROID, NotificationLocale.ES, NOW.minus(Duration.ofDays(30))));
        repository.save(new PushDevice(owner, token, PushPlatform.ANDROID, NotificationLocale.ES, NOW, true));

        assertThat(repository.findByUsers(List.of(owner))).containsExactly(
                new PushDevice(owner, token, PushPlatform.ANDROID, NotificationLocale.ES, NOW, true));
    }

    @Test
    void devicesNotSeenSinceTheCutoffArePurgedAndRecentOnesStay() {
        UUID owner = user();
        repository.save(new PushDevice(owner, new PushToken("ExpoPushToken[stale]"), PushPlatform.IOS, NotificationLocale.ES,
                NOW.minus(Duration.ofDays(121))));
        repository.save(new PushDevice(owner, new PushToken("ExpoPushToken[recent]"), PushPlatform.IOS, NotificationLocale.ES,
                NOW.minus(Duration.ofDays(119))));

        int purged = repository.deleteNotSeenSince(NOW.minus(Duration.ofDays(120)));

        assertThat(purged).isGreaterThanOrEqualTo(1);
        assertThat(tokens(owner)).containsExactly("ExpoPushToken[recent]");
    }

    @Test
    void deletingTheAccountRemovesItsDevices() {
        UUID owner = user();
        repository.save(new PushDevice(owner, new PushToken("ExpoPushToken[gone]"), PushPlatform.IOS, NotificationLocale.ES, NOW));

        jdbc.update("DELETE FROM users WHERE id=?", owner);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM push_devices WHERE token='ExpoPushToken[gone]'", Integer.class)).isZero();
    }

    private List<String> tokens(UUID user) {
        return repository.findByUsers(List.of(user)).stream().map(device -> device.token().value()).toList();
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
