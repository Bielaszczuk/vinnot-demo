package com.vinnot.support.infrastructure;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.notification.application.service.EnqueueNotificationService;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadCodec;
import com.vinnot.notification.infrastructure.outbox.NotificationPayloadSealer;
import com.vinnot.notification.infrastructure.outbox.NotificationRetention;
import com.vinnot.notification.infrastructure.outbox.OutboxNotificationAdapter;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import com.vinnot.support.domain.model.SupportRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.ArrayList;
import java.util.concurrent.Future;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false",
        "app.auth.email.provider=ses", "app.auth.email.from=sender@example.org", "app.support.recipient=support@example.org",
        "jwt.secret=integration-only"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JdbcSupportRequestAdapter.class, DurableEffectQueue.class, SupportDeliveryConfiguration.class, ObjectMapper.class,
        EnqueueNotificationService.class, OutboxNotificationAdapter.class, NotificationPayloadCodec.class,
        NotificationPayloadSealer.class, NotificationRetention.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SupportPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final String SUPPORT_ACK_MARKER = JdbcSupportRequestAdapter.ACKNOWLEDGEMENT_MARKER;
    @Autowired JdbcTemplate jdbc;
    @Autowired JdbcSupportRequestAdapter adapter;
    @Autowired PlatformTransactionManager transactions;
    @Autowired NotificationRetention retention;
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
    private SupportRequest request(UUID id, String message) {
        // One address per request: acknowledgements are capped per address and day.
        return new SupportRequest(id, "Tester", "test-" + id + "@example.org", "support", message);
    }
    private int count(UUID id, String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE "
                + (table.equals("external_effects") ? "deduplication_key = ?" : "id = ?"),
                Integer.class, table.equals("external_effects") ? key(id) : id);
    }
    private static String key(UUID id) {
        return "notification:support:" + id;
    }
    @Test void concurrentRetriesAreDeduplicatedAndChangedContentRejected() throws Exception {
        UUID id = UUID.randomUUID();
        var request = request(id, "Durable message");
        var start = new CountDownLatch(1);
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = new ArrayList<Future<?>>();
            for (int i = 0; i < 6; i++) futures.add(pool.submit(() -> {
                start.await(); adapter.accept(request); return null;
            }));
            start.countDown();
            for (var future : futures) future.get(15, TimeUnit.SECONDS);
        }
        assertThat(count(id, "support_request_receipts")).isEqualTo(1);
        assertThat(count(id, "external_effects")).isEqualTo(1);
        assertThatThrownBy(() -> adapter.accept(request(id, "Changed message"))).isInstanceOf(DomainException.class);
        assertThat(jdbc.queryForObject("SELECT payload->'data'->>'message' FROM external_effects WHERE deduplication_key = ?",
                String.class, key(id))).isEqualTo("Durable message");
        assertThat(jdbc.queryForObject("SELECT kind || ' ' || (payload->>'type') || ' ' || (payload->'recipient'->>'email')"
                + " FROM external_effects WHERE deduplication_key = ?", String.class, key(id)))
                .isEqualTo("NOTIFICATION SUPPORT_REQUEST support@example.org");
        assertThat(jdbc.queryForObject("SELECT (payload->>'type') || ' ' || (payload->'recipient'->>'email') || ' '"
                + " || (payload->'data'->>'subject') || ' ' || ((payload->'data'->>'message') IS NOT NULL)::text"
                + " FROM external_effects WHERE deduplication_key = ?", String.class, "notification:support-received:" + id))
                .as("the requester gets one acknowledgement without their message")
                .isEqualTo("SUPPORT_REQUEST_RECEIVED test-" + id + "@example.org support false");
        // Receipt remains after delivery, preventing another email on a network retry.
        jdbc.update("DELETE FROM external_effects WHERE deduplication_key = ?", key(id));
        adapter.accept(request);
        assertThat(count(id, "external_effects")).isZero();
    }
    @Test void eachAddressGetsAtMostOneAcknowledgementPerDayWithoutTheTypedName() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        UUID third = UUID.randomUUID();
        adapter.accept(new SupportRequest(first, "Visit evil.example", "Repeat@Example.org", "support", "One"));
        adapter.accept(new SupportRequest(second, "Visit evil.example", " repeat@example.org", "support", "Two"));
        assertThat(count(first, "support_request_receipts")).isEqualTo(1);
        assertThat(count(second, "support_request_receipts")).as("the request itself is still stored").isEqualTo(1);
        assertThat(count(second, "external_effects")).as("support still gets it").isEqualTo(1);
        assertThat(acknowledgements("repeat@example.org")).as("one acknowledgement per address and day").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT (payload->'recipient'->>'displayName') IS NULL FROM external_effects"
                + " WHERE deduplication_key = ?", Boolean.class, "notification:support-received:" + first))
                .as("the typed name never reaches the acknowledgement").isTrue();

        jdbc.update("UPDATE support_request_receipts SET created_at = CURRENT_TIMESTAMP - INTERVAL '1 day'"
                + " WHERE content_hash = ?", SUPPORT_ACK_MARKER);
        adapter.accept(new SupportRequest(third, "Tester", "repeat@example.org", "support", "Three"));
        assertThat(acknowledgements("repeat@example.org")).as("a new day allows another one").isEqualTo(2);
    }
    private int acknowledgements(String address) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE payload->>'type' = 'SUPPORT_REQUEST_RECEIVED'"
                + " AND lower(payload->'recipient'->>'email') = ?", Integer.class, address);
    }
    @Test void acceptanceRollsBackAtomicallyAndExpiresOnlySupportData() {
        UUID rolledBack = UUID.randomUUID();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            adapter.accept(request(rolledBack, "Do not retain")); status.setRollbackOnly();
        });
        assertThat(count(rolledBack, "support_request_receipts")).isZero();
        assertThat(count(rolledBack, "external_effects")).isZero();
        UUID old = UUID.randomUUID();
        UUID fresh = UUID.randomUUID();
        adapter.accept(request(old, "Expired"));
        adapter.accept(request(fresh, "Keep"));
        jdbc.update("UPDATE support_request_receipts SET created_at = CURRENT_TIMESTAMP - INTERVAL '31 days' WHERE id = ?", old);
        jdbc.update("UPDATE external_effects SET created_at = CURRENT_TIMESTAMP - INTERVAL '8 days' WHERE deduplication_key = ?", key(old));
        UUID legacy = UUID.randomUUID();
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload, created_at) VALUES (?, 'SUPPORT_REQUEST', ?, '{}',"
                + " CURRENT_TIMESTAMP - INTERVAL '8 days')", legacy, "support:" + legacy);
        adapter.cleanup();
        retention.purgeExpired();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE id = ?", Integer.class, legacy)).isZero();
        assertThat(count(old, "support_request_receipts")).isZero();
        assertThat(count(old, "external_effects")).isZero();
        assertThat(count(fresh, "support_request_receipts")).isEqualTo(1);
        assertThat(count(fresh, "external_effects")).isEqualTo(1);
    }
}
