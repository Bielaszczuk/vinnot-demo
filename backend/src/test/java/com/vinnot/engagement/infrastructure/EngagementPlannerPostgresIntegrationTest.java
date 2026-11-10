package com.vinnot.engagement.infrastructure;

import com.vinnot.engagement.application.model.PlanPage;
import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.port.in.PlanEngagementPageUseCase;
import com.vinnot.engagement.application.port.in.PlanEngagementUseCase;
import com.vinnot.engagement.application.port.out.EngagementAudiencePort;
import com.vinnot.engagement.application.port.out.PlannerLeasePort;
import com.vinnot.engagement.application.service.EngagementPlannerService;
import com.vinnot.engagement.domain.model.EngagementDecision;
import com.vinnot.engagement.domain.model.Holdout;
import com.vinnot.notification.application.port.in.DeliverPushUseCase;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The planner through the real Spring wiring, Postgres and outbox (#405, S10, S16): what one run queues, that a page
 * costs the same statements however many accounts it holds, that two instances never plan at once, and that delivery
 * admits one engagement push per account however many race for it (S5). Schedulers and workers never run here.
 */
@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local", "app.observability.snapshot.enabled=false",
        "app.effects.poll-ms=3600000", "app.events.reminders.enabled=false", "app.engagement.enabled=false"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EngagementPlannerPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final String ZONE = "America/Argentina/Buenos_Aires";
    /** A Thursday, 04:00 in Buenos Aires, after the real clock so the lease a run releases is free again. */
    private static final Instant NOW = Instant.parse("2030-01-03T07:00:00Z");
    private static final AtomicInteger STATEMENTS = new AtomicInteger();
    @Autowired JdbcTemplate jdbc;
    @Autowired PlanEngagementUseCase planner;
    @Autowired PlanEngagementPageUseCase pages;
    @Autowired PlannerLeasePort lease;
    @Autowired EngagementAudiencePort audience;
    @Autowired PushPlanningUseCase planning;
    @Autowired DeliverPushUseCase delivery;
    @Autowired Holdout holdout;
    private EngagementDatabase db;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    /**
     * Plans out whatever earlier tests left at both instants the tests plan at. The delivery test's account lives in
     * {@link #middayZone()}, picked from the real clock, so whether a run at {@code NOW} or an hour later reaches it
     * depends on the time of day; draining both keeps each test's report to its own accounts.
     */
    @BeforeEach
    void fixtures() {
        db = new EngagementDatabase(jdbc);
        planner.plan(NOW);
        planner.plan(NOW.plus(Duration.ofHours(1)));
    }

    @Test
    void aRunQueuesOneGroupedPushPerChosenAccountRecordsTheHoldoutAndPlansEachAccountOncePerDay() {
        List<UUID> sent = new ArrayList<>();
        List<UUID> heldOut = new ArrayList<>();
        cohort(sent, heldOut, 2, 1);
        UUID noDevice = db.user(ZONE, NOW.minus(Duration.ofDays(1)));

        PlanReport report = planner.plan(NOW);

        assertThat(report.skipped()).isFalse();
        assertThat(report.count(EngagementDecision.Outcome.PLANNED)).isEqualTo(3);
        assertThat(report.heldOut()).isOne();
        List<Map<String, Object>> queued = jdbc.queryForList("""
                SELECT payload->>'type' AS type, payload->'userIds' AS users, payload->'data'->>'step' AS step,
                       payload->>'expiresAt' AS expires FROM external_effects
                WHERE kind = 'PUSH_NOTIFICATION' AND jsonb_exists_any(payload->'userIds', ?)""", (Object) array(sent, heldOut, noDevice));
        assertThat(queued).as("both accounts share one request; the held-out one gets none").singleElement().satisfies(row -> {
            assertThat(row.get("type")).isEqualTo("ONBOARDING");
            assertThat(row.get("step")).isEqualTo("1");
            assertThat(row.get("users").toString()).contains(sent.get(0).toString(), sent.get(1).toString());
            assertThat(row.get("expires")).as("21:59 in Buenos Aires").isEqualTo("2030-01-04T00:59:00Z");
        });
        assertThat(jdbc.queryForList("SELECT notification_type FROM engagement_sends WHERE user_id = ? AND holdout",
                String.class, heldOut.getFirst())).containsExactly("ONBOARDING");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM engagement_planning WHERE user_id = ?", Integer.class, noDevice))
                .as("accounts without a device are never planned").isZero();

        PlanReport again = planner.plan(NOW.plus(Duration.ofHours(1)));

        assertThat(again.count(EngagementDecision.Outcome.PLANNED)).as("planned once per local day").isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE jsonb_exists_any(payload->'userIds', ?)", Integer.class,
                (Object) array(sent, heldOut, noDevice))).isOne();
    }

    @Test
    void aPageCostsTheSameStatementsForTenAccountsAsForAHundred() {
        cohort(new ArrayList<>(), new ArrayList<>(), 9, 1);
        int small = statementsOfOneRun();
        cohort(new ArrayList<>(), new ArrayList<>(), 95, 5);
        int large = statementsOfOneRun();

        assertThat(large).isEqualTo(small);
        assertThat(small).as("lease, switches, zones, one page and its fixed queries").isLessThan(40);
    }

    @Test
    void twoInstancesNeverPlanAtTheSameTime() throws Exception {
        cohort(new ArrayList<>(), new ArrayList<>(), 1, 0);
        CountDownLatch inPage = new CountDownLatch(1);
        CountDownLatch otherDone = new CountDownLatch(1);
        PlanEngagementPageUseCase waiting = page -> {
            inPage.countDown();
            await(otherDone);
            return pages.plan(page);
        };
        var first = new EngagementPlannerService(lease, audience, waiting, planning, 4, 6, 1000, 4, Duration.ofHours(2));

        CompletableFuture<PlanReport> running = CompletableFuture.supplyAsync(() -> first.plan(NOW));
        assertThat(inPage.await(30, TimeUnit.SECONDS)).isTrue();
        PlanReport second = planner.plan(NOW);
        otherDone.countDown();

        assertThat(second.skipped()).isTrue();
        PlanReport firstReport = running.get(30, TimeUnit.SECONDS);
        assertThat(firstReport.skipped()).isFalse();
        assertThat(firstReport.count(EngagementDecision.Outcome.PLANNED)).isOne();
        assertThat(planner.plan(NOW).skipped()).as("the lease is released after a run").isFalse();
    }

    @Test
    void deliveryAdmitsOneEngagementPushPerAccountHoweverManyRaceAndNeverBlocksAReminder() throws Exception {
        UUID member = active();
        UUID wine = UUID.randomUUID();
        List<PushRequest> racing = new ArrayList<>();
        for (int index = 0; index < 4; index++) {
            racing.add(new PushRequest(NotificationType.TASTE_PICK, List.of(member), Map.of("wine", "Gran Malbec",
                    "wineId", wine.toString(), "reasonKind", "GRAPE", "reason", "Malbec", NotificationType.CONTENT_REF,
                    "WINE:" + wine), "engagement:race:" + UUID.randomUUID()));
        }
        CountDownLatch start = new CountDownLatch(1);
        List<CompletableFuture<Void>> runs = racing.stream().map(request -> CompletableFuture.runAsync(() -> {
            await(start);
            delivery.deliver(request);
        })).toList();
        start.countDown();
        CompletableFuture.allOf(runs.toArray(CompletableFuture[]::new)).get(60, TimeUnit.SECONDS);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM engagement_sends WHERE user_id = ?", Integer.class, member))
                .isOne();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM push_sends WHERE user_id = ?", Integer.class, member)).isOne();

        delivery.deliver(new PushRequest(NotificationType.EVENT_REMINDER, List.of(member), Map.of("registrationId",
                UUID.randomUUID().toString(), "title", "Cata", "startDate", Instant.now().plus(Duration.ofDays(1)).toString()), "reminder:" + UUID.randomUUID()));

        assertThat(jdbc.queryForList("SELECT category FROM push_sends WHERE user_id = ? ORDER BY category", String.class, member))
                .as("S5: the reminder is delivered next to the engagement push").containsExactly("RECOMMENDATIONS", "TICKETS");
    }

    private int statementsOfOneRun() {
        STATEMENTS.set(0);
        planner.plan(NOW);
        return STATEMENTS.get();
    }

    /** Accounts created yesterday with a device, split by the holdout so each cohort has the shape asked for. */
    private void cohort(List<UUID> sent, List<UUID> heldOut, int sending, int holding) {
        int found = 0;
        int held = 0;
        while (found < sending || held < holding) {
            UUID id = UUID.randomUUID();
            boolean out = holdout.includes(id);
            if (out && held < holding || !out && found < sending) {
                insert(id);
                (out ? heldOut : sent).add(id);
                if (out) {
                    held++;
                } else {
                    found++;
                }
            }
        }
    }

    private UUID active() {
        UUID id;
        do {
            id = UUID.randomUUID();
        } while (holdout.includes(id));
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,timezone) VALUES (?,?,?,'x','A','B',?)",
                id, "d-" + id.toString().substring(0, 18), id + "@example.invalid", middayZone());
        db.device(id, Instant.now());
        return id;
    }

    /**
     * A zone where it is about 13:00 now. Delivery runs on the real clock and holds engagement pushes through quiet
     * hours (22:00 to 09:00 locally), so a fixed zone would make the delivery test fail part of every day.
     */
    private static String middayZone() {
        int offset = Math.floorMod(13 - Instant.now().atZone(ZoneOffset.UTC).getHour() + 11, 24) - 11;
        return offset == 0 ? "Etc/GMT" : offset > 0 ? "Etc/GMT-" + offset : "Etc/GMT+" + -offset;
    }

    private void insert(UUID id) {
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,timezone,created_at)"
                + " VALUES (?,?,?,'x','A','B',?,?)", id, "p-" + id.toString().substring(0, 18), id + "@example.invalid", ZONE,
                Timestamp.from(NOW.minus(Duration.ofDays(1))));
        db.device(id, NOW.minus(Duration.ofDays(1)));
    }

    private static String[] array(List<UUID> first, List<UUID> second, UUID extra) {
        List<String> ids = new ArrayList<>();
        first.forEach(id -> ids.add(id.toString()));
        second.forEach(id -> ids.add(id.toString()));
        ids.add(extra.toString());
        return ids.toArray(String[]::new);
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(30, TimeUnit.SECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    /** Counts the statements the planner's own threads prepare, ignoring whatever else the context runs. */
    @TestConfiguration
    static class CountingDataSource {
        @Bean
        static BeanPostProcessor countStatements() {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String name) {
                    return bean instanceof DataSource source && !(bean instanceof DelegatingDataSource) ? new Counting(source) : bean;
                }
            };
        }
    }

    private static final class Counting extends DelegatingDataSource {
        private static final Set<String> PREPARING = Set.of("prepareStatement", "createStatement", "prepareCall");

        Counting(DataSource target) {
            super(target);
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection connection = super.getConnection();
            return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[] {Connection.class},
                    (proxy, method, arguments) -> {
                        String thread = Thread.currentThread().getName();
                        if (PREPARING.contains(method.getName()) && (thread.startsWith("engagement-page-") || thread.equals("main"))) {
                            STATEMENTS.incrementAndGet();
                        }
                        try {
                            return method.invoke(connection, arguments);
                        } catch (InvocationTargetException failure) {
                            throw failure.getCause();
                        }
                    });
        }
    }
}
