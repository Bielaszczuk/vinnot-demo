package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort.RecordedScan;
import com.vinnot.wine.application.query.response.WineLabelScanResponse.Outcome;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** S12 persistence: scan ids, barcodes and feedback on wine_label_scans, and crowd barcode confirmations (V92). */
@DataJpaTest(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JdbcWineLabelScanHistory.class, JdbcWineBarcodeConfirmations.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class WineLabelScanFeedbackPostgresIntegrationTest {
    private static final String BARCODE = "7791234567890";
    private static final Instant NOW = Instant.parse("2026-11-11T12:00:00Z");

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private JdbcWineLabelScanHistory scans;

    @Autowired
    private JdbcWineBarcodeConfirmations barcodes;

    @Autowired
    private JdbcTemplate jdbc;

    private final List<UUID> users = new ArrayList<>();
    private final List<UUID> wines = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        users.forEach(user -> jdbc.update("DELETE FROM users WHERE id = ?", user));
        wines.forEach(wine -> jdbc.update("DELETE FROM wines WHERE id = ?", wine));
    }

    @Test
    void aScanIsStoredWithItsIdAndBarcodeAndFoundOnlyByItsOwner() {
        UUID member = user();
        UUID other = user();
        UUID wine = wine(true);
        UUID scanId = UUID.randomUUID();

        assertThat(scans.record(scanId, member, Outcome.EXACT_MATCH, wine, BARCODE, NOW)).isTrue();

        assertThat(scans.findOwnedBy(scanId, member))
                .contains(new RecordedScan(scanId, Outcome.EXACT_MATCH, wine, BARCODE));
        assertThat(scans.findOwnedBy(scanId, other)).isEmpty();
        assertThat(scans.findOwnedBy(UUID.randomUUID(), member)).isEmpty();
    }

    @Test
    void aScanOfAMemberWhoIsGoneIsNotStored() {
        UUID scanId = UUID.randomUUID();

        assertThat(scans.record(scanId, UUID.randomUUID(), Outcome.NO_MATCH, null, null, NOW)).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_label_scans WHERE id = ?", Integer.class, scanId))
                .isZero();
    }

    @Test
    void feedbackIsStoredAndSendingItAgainReplacesIt() {
        UUID member = user();
        UUID chosen = wine(true);
        UUID scanId = UUID.randomUUID();
        scans.record(scanId, member, Outcome.POSSIBLE_MATCHES, null, null, NOW);

        scans.saveFeedback(scanId, WineLabelScanVerdict.CORRECTED, chosen, NOW);
        assertThat(feedbackOf(scanId)).containsEntry("feedback", "CORRECTED").containsEntry("feedback_wine_id", chosen);

        scans.saveFeedback(scanId, WineLabelScanVerdict.NOT_IN_CATALOG, null, NOW.plusSeconds(60));
        Map<String, Object> replaced = feedbackOf(scanId);
        assertThat(replaced).containsEntry("feedback", "NOT_IN_CATALOG");
        assertThat(replaced.get("feedback_wine_id")).isNull();
        assertThat(((Timestamp) replaced.get("feedback_at")).toInstant()).isEqualTo(NOW.plusSeconds(60));
    }

    @Test
    void aMembersLatestBarcodeConfirmationWins() {
        UUID member = user();
        UUID first = wine(true);
        UUID second = wine(true);

        barcodes.confirm(BARCODE, member, first, NOW);
        barcodes.confirm(BARCODE, member, second, NOW.plusSeconds(60));

        assertThat(jdbc.queryForList("SELECT wine_id FROM wine_barcode_confirmations WHERE barcode = ? AND user_id = ?",
                UUID.class, BARCODE, member)).containsExactly(second);
    }

    @Test
    void aBarcodeNeedsTwoMembersForTheSameWine() {
        UUID wine = wine(true);
        barcodes.confirm(BARCODE, user(), wine, NOW);
        assertThat(barcodes.findCrowdConfirmedWine(BARCODE, 2)).isEmpty();

        barcodes.confirm(BARCODE, user(), wine, NOW);
        assertThat(barcodes.findCrowdConfirmedWine(BARCODE, 2)).contains(wine);
        assertThat(barcodes.findCrowdConfirmedWine("7790000000000", 2)).isEmpty();
    }

    @Test
    void aTiedBarcodeIsNotAnsweredUntilOneWineLeads() {
        UUID leading = wine(true);
        UUID other = wine(true);
        barcodes.confirm(BARCODE, user(), leading, NOW);
        barcodes.confirm(BARCODE, user(), leading, NOW);
        barcodes.confirm(BARCODE, user(), other, NOW);
        barcodes.confirm(BARCODE, user(), other, NOW);
        assertThat(barcodes.findCrowdConfirmedWine(BARCODE, 2)).isEmpty();

        barcodes.confirm(BARCODE, user(), leading, NOW);
        assertThat(barcodes.findCrowdConfirmedWine(BARCODE, 2)).contains(leading);
    }

    @Test
    void aTieForTheLeadIsNotBrokenByALowerRunnerUp() {
        UUID first = wine(true);
        UUID second = wine(true);
        UUID third = wine(true);
        for (UUID wine : List.of(first, first, first, second, second, second, third, third)) {
            barcodes.confirm(BARCODE, user(), wine, NOW);
        }

        assertThat(barcodes.findCrowdConfirmedWine(BARCODE, 2)).isEmpty();
    }

    @Test
    void anInactiveWineIsNeverAnswered() {
        UUID inactive = wine(false);
        barcodes.confirm(BARCODE, user(), inactive, NOW);
        barcodes.confirm(BARCODE, user(), inactive, NOW);

        assertThat(barcodes.findCrowdConfirmedWine(BARCODE, 2)).isEmpty();
    }

    private Map<String, Object> feedbackOf(UUID scanId) {
        return jdbc.queryForMap("SELECT feedback, feedback_wine_id, feedback_at FROM wine_label_scans WHERE id = ?",
                scanId);
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id, username, email, password, first_name, last_name, email_verified)
                VALUES (?, ?, ?, 'not-a-real-hash', 'Scan', 'Fixture', true)
                """, id, id.toString(), id + "@example.org");
        users.add(id);
        return id;
    }

    private UUID wine(boolean active) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines (id, name, wine_type, is_active) VALUES (?, 'Barcode fixture', 'RED', ?)",
                id, active);
        wines.add(id);
        return id;
    }
}
