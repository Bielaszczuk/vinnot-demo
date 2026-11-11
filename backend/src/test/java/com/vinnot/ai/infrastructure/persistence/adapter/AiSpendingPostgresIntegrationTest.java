package com.vinnot.ai.infrastructure.persistence.adapter;

import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import com.vinnot.ai.application.port.out.AiSpendingLedgerPort;
import com.vinnot.ai.application.service.AiProviderAdmissionService;
import com.vinnot.ai.infrastructure.persistence.lock.PostgresAiGenerationLeaseAdapter;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ConcurrentLinkedQueue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.hikari.maximum-pool-size=6", "spring.datasource.hikari.minimum-idle=1",
        "spring.datasource.hikari.connection-timeout=3000"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PostgresAiSpendingLedgerAdapter.class, PostgresAiGenerationLeaseAdapter.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AiSpendingPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired
    private PostgresAiSpendingLedgerAdapter ledger;
    @Autowired
    private PostgresAiGenerationLeaseAdapter leases;
    @Autowired
    private JdbcTemplate jdbc;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void clearIsolatedAccounting() {
        jdbc.execute("TRUNCATE ai_spending_reservation_windows, ai_spending_reservations, ai_spending_windows, ai_generation_leases");
    }

    @Test
    void twentyConcurrentReservationsCannotOverspendAndSettlementIsIdempotent() throws Exception {
        var accepted = new AtomicInteger();
        var rejected = new AtomicInteger();
        var ids = new ConcurrentLinkedQueue<UUID>();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(20)) {
            var tasks = new ArrayList<Future<?>>();
            for (int index = 0; index < 20; index++) {
                tasks.add(executor.submit(() -> {
                    await(start);
                    try {
                        ids.add(ledger.reserve("model", new BigDecimal("0.10"), windows("1")));
                        accepted.incrementAndGet();
                    } catch (AiSpendingLedgerPort.BudgetExceededException exception) {
                        rejected.incrementAndGet();
                    }
                }));
            }
            start.countDown();
            for (var task : tasks) {
                task.get(20, TimeUnit.SECONDS);
            }
        }
        assertThat(accepted.get()).isEqualTo(10);
        assertThat(rejected.get()).isEqualTo(10);
        assertMoney("reserved_usd", "1.0");
        for (UUID id : ids) {
            ledger.complete(id, Optional.of(new BigDecimal("0.01")));
            ledger.complete(id, Optional.of(new BigDecimal("0.01")));
        }
        assertMoney("reserved_usd", "0");
        assertMoney("spent_usd", "0.10");
    }

    @Test
    void rollsBackEveryWindowWhenAnyBudgetIsExceeded() {
        assertThatThrownBy(() -> ledger.reserve("model", new BigDecimal("0.2"), List.of(
                new AiSpendingLedgerPort.Window("a-month", BigDecimal.ONE),
                new AiSpendingLedgerPort.Window("z-day", new BigDecimal("0.1")))))
                .isInstanceOf(AiSpendingLedgerPort.BudgetExceededException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_spending_windows", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_spending_reservations", Integer.class)).isZero();
    }

    @Test
    void unknownBillingRemainsDurableAndCanBeReconciledWithoutDoubleCharging() {
        UUID id = ledger.reserve("model", BigDecimal.ONE, windows("1"));
        ledger.complete(id, Optional.empty());
        ledger.complete(id, Optional.empty());
        assertMoney("reserved_usd", "1");
        assertThatThrownBy(() -> ledger.reserve("model", new BigDecimal("0.01"), windows("1")))
                .isInstanceOf(AiSpendingLedgerPort.BudgetExceededException.class);
        ledger.complete(id, Optional.of(new BigDecimal("0.25")));
        assertMoney("reserved_usd", "0");
        assertMoney("spent_usd", "0.25");
    }

    @Test
    void readsTheSpentAndReservedAmountOfOneWindowAndZeroForAnUnusedWindow() {
        assertThat(ledger.committedUsd("month:2026-09")).isEqualByComparingTo("0");
        UUID settled = ledger.reserve("model", new BigDecimal("0.40"), windows("1"));
        ledger.complete(settled, Optional.of(new BigDecimal("0.25")));
        ledger.reserve("model", new BigDecimal("0.10"), windows("1"));
        ledger.reserve("model", new BigDecimal("0.30"), List.of(new AiSpendingLedgerPort.Window("month:2026-10", BigDecimal.ONE)));

        assertThat(ledger.committedUsd("month:2026-09")).isEqualByComparingTo("0.35");
        assertThat(ledger.committedUsd("month:2026-10")).isEqualByComparingTo("0.30");
        assertThat(ledger.committedUsd("month:2026-11")).isEqualByComparingTo("0");
        assertMoney("reserved_usd", "0.40");
        assertMoney("spent_usd", "0.25");
    }

    @Test
    void rejectsInvalidMoneyWithoutMutatingTheLedger() {
        assertThatThrownBy(() -> ledger.reserve("model", BigDecimal.ZERO, windows("1")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ledger.reserve("model", BigDecimal.ONE, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        UUID id = ledger.reserve("model", BigDecimal.ONE, windows("1"));
        assertThatThrownBy(() -> ledger.complete(id, Optional.of(BigDecimal.ONE.negate())))
                .isInstanceOf(IllegalArgumentException.class);
        assertMoney("reserved_usd", "1");
    }

    @Test
    void admitsTwoOfTwentyBackgroundRequestsWithoutAQueueKeepingTheInteractiveSlot() throws Exception {
        var policy = new AiProviderAdmissionPolicy(3, Duration.ofMinutes(2), BigDecimal.ONE, BigDecimal.ZERO, true);
        // Distinct service objects simulate replicas sharing the same durable lease and ledger ports.
        var services = List.of(new AiProviderAdmissionService(leases, ledger, policy),
                new AiProviderAdmissionService(leases, ledger, policy));
        var ready = new CountDownLatch(20);
        var start = new CountDownLatch(1);
        var attempted = new CountDownLatch(20);
        var complete = new CountDownLatch(1);
        var accepted = new AtomicInteger();
        var rejected = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(20)) {
            var tasks = new ArrayList<Future<?>>();
            for (int index = 0; index < 20; index++) {
                var service = services.get(index % services.size());
                tasks.add(executor.submit(() -> {
                    ready.countDown();
                    await(start);
                    try {
                        var permit = service.acquire("model", new BigDecimal("0.1"));
                        accepted.incrementAndGet();
                        attempted.countDown();
                        await(complete);
                        service.complete(permit, Optional.of(new BigDecimal("0.01")));
                    } catch (ExternalServiceUnavailableException exception) {
                        assertThat(exception.getCode()).isEqualTo("AI_CAPACITY_EXCEEDED");
                        rejected.incrementAndGet();
                        attempted.countDown();
                    }
                }));
            }
            try {
                assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
                start.countDown();
                assertThat(attempted.await(20, TimeUnit.SECONDS)).isTrue();
                assertThat(accepted.get()).isEqualTo(2);
                assertThat(rejected.get()).isEqualTo(18);
                assertMoney("reserved_usd", "0.2");
            } finally {
                start.countDown();
                complete.countDown();
            }
            for (var task : tasks) {
                task.get(20, TimeUnit.SECONDS);
            }
        }
        assertMoney("reserved_usd", "0");
        assertMoney("spent_usd", "0.02");
        var permit = services.getFirst().acquire("model", new BigDecimal("0.1"));
        services.getFirst().complete(permit, Optional.of(BigDecimal.ZERO));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_generation_leases", Integer.class)).isZero();
    }

    private List<AiSpendingLedgerPort.Window> windows(String limit) {
        return List.of(new AiSpendingLedgerPort.Window("month:2026-09", new BigDecimal(limit)));
    }

    private void assertMoney(String column, String expected) {
        assertThat(jdbc.queryForObject("SELECT COALESCE(SUM(" + column + "), 0) FROM ai_spending_windows", BigDecimal.class))
                .isEqualByComparingTo(expected);
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(30, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Test coordination timed out");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
