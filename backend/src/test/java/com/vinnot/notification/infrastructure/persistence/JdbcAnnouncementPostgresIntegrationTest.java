package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.port.out.AnnouncementAudiencePort.Recipient;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.EmailSuppressionReason;
import com.vinnot.notification.domain.model.NotificationLocale;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

/** The announcement audience query and the announcements table (V60), against the real schema. */
@Testcontainers(disabledWithoutDocker = true)
class JdbcAnnouncementPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-10-21T12:00:00Z").truncatedTo(ChronoUnit.SECONDS);
    private static final String PARTNER_ROLE = "09039e7a-ae41-4877-9dd6-360e9f6b369f";
    private static JdbcTemplate jdbc;
    private static TransactionTemplate transactions;
    private static JdbcAnnouncementAudience audiences;
    private static JdbcAnnouncementStore store;
    private static JdbcEmailSuppressionRepository suppressions;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        audiences = new JdbcAnnouncementAudience(new NamedParameterJdbcTemplate(jdbc));
        store = new JdbcAnnouncementStore(jdbc);
        suppressions = new JdbcEmailSuppressionRepository(jdbc);
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM announcements");
    }

    @Test
    void aCountryReachesTheMembersWhoseRegionBelongsToItAndARegionMustBelongToTheCountry() {
        UUID country = country();
        UUID mendoza = region(country);
        UUID salta = region(country);
        UUID elsewhere = region();
        UUID ana = user(mendoza, "es", true, "ana");
        UUID bob = user(salta, "es", true, "bob");
        user(elsewhere, "es", true, "cid");
        UUID located = user(null, "es", true, "dan");
        jdbc.update("INSERT INTO user_event_areas (user_id, latitude, longitude) VALUES (?, -32.9, -68.8)", located);
        user(null, "es", true, "eve");

        assertThat(audiences.count(inCountry(null, country), false)).isEqualTo(new AnnouncementReach(2, 0, 2));
        assertThat(audiences.after(inCountry(null, country), false, null, 10)).extracting(Recipient::userId)
                .containsExactlyInAnyOrder(ana, bob);
        assertThat(audiences.count(inCountry(mendoza, country), false)).as("region and country").isEqualTo(new AnnouncementReach(1, 0, 1));
        assertThat(audiences.count(inCountry(elsewhere, country), false)).as("a region of another country")
                .isEqualTo(new AnnouncementReach(0, 0, 0));
    }

    @Test
    void aRepeatedSaveOfTheSameIdKeepsTheFirstRecordWithItsCountry() {
        UUID admin = user(null, "es", true, "admin");
        UUID country = country();
        Announcement news = new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.ES,
                new AnnouncementContent("Vendimia", "Catas.")), inCountry(null, country), AnnouncementDestination.EVENTS);
        Announcement other = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES,
                new AnnouncementContent("Otra", "Cosa.")), inCountry(null, null), AnnouncementDestination.HOME);
        UUID id = UUID.randomUUID();
        var sender = new AnnouncementStorePort.Sender(admin, "admin@vinnot.test");

        assertThat(store.save(id, news, false, 3, sender, NOW)).isTrue();
        assertThat(store.save(id, other, false, 9, sender, NOW.plusSeconds(5))).as("a duplicate is not stored").isFalse();

        assertThat(store.find(id)).contains(new AnnouncementRecord(id, AnnouncementKind.NEWS, false, news.audience(),
                AnnouncementDestination.EVENTS, "Vendimia", 3, "admin@vinnot.test", NOW, null));
        assertThat(store.find(UUID.randomUUID())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM announcements", Integer.class)).isEqualTo(1);
    }

    @Test
    void aTestIsNeverPickedForDeliveryEvenWithoutItsCompletion() {
        UUID admin = user(null, "es", true, "admin");
        UUID tested = UUID.randomUUID();
        store.save(tested, new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.EN,
                new AnnouncementContent("Maintenance", "Sunday.")), inCountry(null, null), AnnouncementDestination.HOME),
                true, 1, new AnnouncementStorePort.Sender(admin, "admin@vinnot.test"), NOW);
        jdbc.update("UPDATE announcements SET completed_at = NULL WHERE id = ?", tested);

        assertThat(store.lockNextPending()).isEmpty();
    }

    @Test
    void theAudienceKeepsActiveAccountsOfTheSegmentAndNewsSkipsRevokedConsentAndChannelsTurnedOff() {
        UUID region = region();
        UUID ana = user(region, "es", true, "ana");
        device(ana);
        UUID bob = user(region, "en", true, "bob");
        device(bob);
        consent(bob, true, NOW);
        newsletter(bob, "EMAIL");
        newsletter(bob, "PUSH");
        jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?::uuid)", bob, PARTNER_ROLE);
        UUID cid = user(region, "es", true, "cid");
        consent(cid, true, NOW.minusSeconds(60));
        consent(cid, false, NOW);
        newsletter(cid, "EMAIL");
        UUID dan = user(region, "es", true, "Dan");
        consent(dan, true, NOW);
        newsletter(dan, "EMAIL");
        suppressions.suppress(" dan-" + dan + "@VINNOT.test ", EmailSuppressionReason.HARD_BOUNCE);
        UUID eve = user(region, "es", true, "eve");
        jdbc.update("UPDATE users SET locked = true WHERE id = ?", eve);
        UUID fay = user(region, "en", false, "fay");
        device(fay);
        UUID gus = user(region, "es", true, "gus");
        jdbc.update("UPDATE users SET active = false WHERE id = ?", gus);
        user(region(), "es", true, "other-region");

        assertThat(audiences.count(segment(true, true, null, region, null), false)).as("service notice")
                .isEqualTo(new AnnouncementReach(3, 3, 4));
        assertThat(audiences.count(segment(true, false, null, region, null), false)).isEqualTo(new AnnouncementReach(3, 0, 3));
        // News reach accounts that never decided (ana, fay) as well as bob; cid revoked, dan's address is suppressed.
        assertThat(audiences.count(segment(true, true, null, region, null), true)).as("news")
                .isEqualTo(new AnnouncementReach(2, 3, 3));
        UUID otherRegion = region();
        UUID hal = user(otherRegion, "es", true, "hal");
        device(hal);
        jdbc.update("INSERT INTO notification_preferences (user_id, category, channel, enabled) VALUES (?, 'NEWSLETTER', 'EMAIL', false)",
                hal);
        assertThat(audiences.count(segment(true, true, null, otherRegion, null), true)).as("news email turned off")
                .isEqualTo(new AnnouncementReach(0, 1, 1));
        assertThat(audiences.count(segment(true, true, "en", region, null), false)).isEqualTo(new AnnouncementReach(1, 2, 2));
        assertThat(audiences.count(segment(true, true, null, region, "PARTNER"), false)).isEqualTo(new AnnouncementReach(1, 1, 1));

        // Postgres orders uuids by their bytes, which is their text order (Java's compareTo is signed).
        List<UUID> expected = List.of(ana, bob, cid, fay).stream().sorted(Comparator.comparing(UUID::toString)).toList();
        List<Recipient> first = audiences.after(segment(true, true, null, region, null), false, null, 2);
        List<Recipient> rest = audiences.after(segment(true, true, null, region, null), false, first.get(1).userId(), 2);
        assertThat(first).extracting(Recipient::userId).containsExactlyElementsOf(expected.subList(0, 2));
        assertThat(rest).extracting(Recipient::userId).containsExactlyElementsOf(expected.subList(2, 4));
        assertThat(audiences.after(segment(true, true, null, region, null), false, null, 10))
                .contains(new Recipient(bob, NotificationLocale.EN, true, true), new Recipient(fay, NotificationLocale.EN, false, true),
                        new Recipient(cid, NotificationLocale.ES, true, false));
    }

    @Test
    void anAnnouncementIsAuditedAndDeliveredOnceThroughItsLockedCursor() {
        UUID admin = user(null, "es", true, "admin");
        UUID region = region();
        Announcement news = new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.ES,
                new AnnouncementContent("Vendimia", "Catas **todo el mes**."), NotificationLocale.EN,
                new AnnouncementContent("Harvest", "Tastings all month.")),
                new AnnouncementAudience(true, false, "es", region, null, "PARTNER"), AnnouncementDestination.EVENTS);
        Announcement test = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.EN,
                new AnnouncementContent("Maintenance", "Sunday.")), new AnnouncementAudience(false, true, null, null, null, null),
                AnnouncementDestination.HOME);
        UUID sent = UUID.randomUUID();
        UUID tested = UUID.randomUUID();
        var sender = new AnnouncementStorePort.Sender(admin, "admin@vinnot.test");
        store.save(sent, news, false, 12, sender, NOW);
        store.save(tested, test, true, 1, sender, NOW.plusSeconds(1));

        transactions.executeWithoutResult(status -> {
            Optional<AnnouncementStorePort.Pending> pending = store.lockNextPending();
            assertThat(pending).contains(new AnnouncementStorePort.Pending(sent, news, null));
            assertThat(CompletableFuture.supplyAsync(() -> transactions.execute(other -> store.lockNextPending())).join())
                    .as("another instance skips the locked announcement").isEmpty();
            store.advance(sent, admin, null);
        });
        assertThat(store.lockNextPending()).contains(new AnnouncementStorePort.Pending(sent, news, admin));
        store.advance(sent, admin, NOW.plusSeconds(30));
        assertThat(store.lockNextPending()).isEmpty();

        jdbc.update("DELETE FROM users WHERE id = ?", admin);
        assertThat(store.recent(10)).containsExactly(
                new AnnouncementRecord(tested, AnnouncementKind.SERVICE, true, test.audience(), AnnouncementDestination.HOME,
                        "Maintenance", 1, "admin@vinnot.test", NOW.plusSeconds(1), NOW.plusSeconds(1)),
                new AnnouncementRecord(sent, AnnouncementKind.NEWS, false, news.audience(), AnnouncementDestination.EVENTS,
                        "Vendimia", 12, "admin@vinnot.test", NOW, NOW.plusSeconds(30)));
    }

    private static AnnouncementAudience segment(boolean email, boolean push, String language, UUID region, String role) {
        return new AnnouncementAudience(email, push, language, region, null, role);
    }

    private static AnnouncementAudience inCountry(UUID region, UUID country) {
        return new AnnouncementAudience(true, false, null, region, country, null);
    }

    private static UUID region() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO regions (id, name, country_id) SELECT ?, ?, id FROM countries WHERE code = 'ar'", id,
                "Region " + id);
        return id;
    }

    private static UUID region(UUID country) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO regions (id, name, country_id) VALUES (?, ?, ?)", id, "Region " + id, country);
        return id;
    }

    private static UUID country() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO countries (id, code, name) VALUES (?, ?, ?)", id, id.toString().substring(0, 8),
                "Country " + id);
        return id;
    }

    private static UUID user(UUID region, String language, boolean verified, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users (id, email, username, password, first_name, last_name, preferred_language, email_verified)
                VALUES (?, ?, ?, 'hash', 'A', 'B', ?, ?)
                """, id, name + "-" + id + "@vinnot.test", name + "-" + id, language, verified);
        if (Objects.nonNull(region)) {
            jdbc.update("INSERT INTO user_event_areas (user_id, region_id) VALUES (?, ?)", id, region);
        }
        return id;
    }

    private static void device(UUID user) {
        jdbc.update("INSERT INTO push_devices (token, user_id, platform, locale) VALUES (?, ?, 'IOS', 'es')",
                "ExponentPushToken[" + user + "]", user);
    }

    private static void consent(UUID user, boolean granted, Instant at) {
        jdbc.update("INSERT INTO marketing_consent_events (id, user_id, granted, source, occurred_at) VALUES (?, ?, ?, 'WEB', ?)",
                UUID.randomUUID(), user, granted, Timestamp.from(at));
    }

    private static void newsletter(UUID user, String channel) {
        jdbc.update("INSERT INTO notification_preferences (user_id, category, channel, enabled) VALUES (?, 'NEWSLETTER', ?, true)",
                user, channel);
    }
}
