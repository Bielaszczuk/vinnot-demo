package com.vinnot.legal.infrastructure;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.legal.application.service.LegalAgreementService;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.legal.domain.model.TermsDocument.Section;
import com.vinnot.legal.domain.model.TermsSelection;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JdbcLegalRepository.class, JdbcTermsAnnouncementAdapter.class, LegalAgreementService.class, ObjectMapper.class})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class LegalPostgresIntegrationTest {
    private static final String FIRST_VERSION = "2026-09-27.1";
    private static final String TICKET_PAYMENTS_VERSION = "2026-10-29.1";
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired JdbcLegalRepository repository;
    @Autowired LegalAgreementService agreements;
    @Autowired JdbcTermsAnnouncementAdapter announcements;
    @Autowired PlatformTransactionManager transactions;
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'hash','QA','User')",
                id, id.toString(), id + "@example.org");
        return id;
    }
    @Test void migrationArchivesBothLanguagesAndConsentIsAtomicIdempotentAndAccountScoped() throws Exception {
        var id = account();
        var document = agreements.current("es");
        var selection = new TermsSelection(document.version(), "es", document.contentHash(), true);
        assertThat(document.sections()).hasSize(8);
        assertThat(agreements.status(id, "es").required()).isTrue();
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            agreements.accept(id, selection);
            tx.setRollbackOnly();
        });
        assertThat(agreements.status(id, "es").required()).isTrue();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            var jobs = new ArrayList<Future<?>>();
            for (int i = 0; i < 6; i++) jobs.add(pool.submit(() -> agreements.accept(id, selection)));
            for (var job : jobs) job.get(10, TimeUnit.SECONDS);
        }
        var accepted = agreements.status(id, "es");
        assertThat(accepted.required()).isFalse();
        assertThat(agreements.accept(id, selection).acceptedAt()).isEqualTo(accepted.acceptedAt());
        assertThat(agreements.status(id, "en").required()).isFalse();
        assertThat(agreements.status(account(), "es").required()).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_legal_acceptances WHERE user_id = ?", Integer.class, id)).isEqualTo(1);
        assertThatThrownBy(() -> jdbc.update("UPDATE legal_documents SET title='Changed'")).hasMessageContaining("immutable");
        assertThatThrownBy(() -> jdbc.update("UPDATE user_legal_acceptances SET locale='en' WHERE user_id=?", id)).hasMessageContaining("immutable");
        jdbc.update("DELETE FROM users WHERE id=?", id);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_legal_acceptances WHERE user_id=?", Integer.class, id)).isZero();
        assertThat(repository.version(document.version(), "en").contentHash()).hasSize(64).isNotEqualTo(document.contentHash());
        assertThat(repository.enforcementEnabled()).isFalse();
        assertThatThrownBy(() -> repository.version("unknown", "es")).hasMessageContaining("Terms");
    }
    @Test void theTicketPaymentsReleaseIsANewRevisionInBothLanguagesWithReproducibleHashes() throws Exception {
        for (String locale : List.of("es", "en")) {
            var previous = repository.version(FIRST_VERSION, locale);
            var release = repository.version(TICKET_PAYMENTS_VERSION, locale);
            assertThat(contentHash(previous)).as("V21 %s hash", locale).isEqualTo(previous.contentHash());
            assertThat(contentHash(release)).as("V75 %s hash", locale).isEqualTo(release.contentHash());
            assertThat(release.acceptanceRevision()).isEqualTo("terms-2");
            assertThat(release.locale()).isEqualTo(locale);
            assertThat(release.title()).isEqualTo(previous.title());
            assertThat(release.summary()).isEqualTo(previous.summary());
            assertThat(release.sections()).extracting(Section::id)
                    .containsExactlyElementsOf(previous.sections().stream().map(Section::id).toList());
            for (int index = 0; index < previous.sections().size(); index++) {
                if (!"transactions".equals(previous.sections().get(index).id())) {
                    assertThat(release.sections().get(index)).isEqualTo(previous.sections().get(index));
                }
            }
            assertThat(repository.revisionChangedAt(release)).as("a material change starts its notice").isPresent();
        }
        Map<String, String> facts = Map.of(
                "es", "Mercado Pago|no almacena datos de tarjetas|comisión|sección Cobros de eventos de la cuenta de organizador"
                        + "|solo a las ventas nuevas|devoluciones se procesan a través de Mercado Pago|suscripciones pagas",
                "en", "Mercado Pago|does not store card details|commission|Event payments section of the organiser account"
                        + "|only to new sales|Refunds are processed through Mercado Pago|paid subscriptions");
        for (var locale : facts.entrySet()) {
            String body = transactions(repository.version(TICKET_PAYMENTS_VERSION, locale.getKey())).body();
            assertThat(body).contains(locale.getValue().split("\\|"));
            assertThat(body).doesNotContain("fuera del procesamiento de pagos", "outside Vinnot payment processing");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM legal_documents WHERE version = ?", Integer.class,
                TICKET_PAYMENTS_VERSION)).isEqualTo(2);
    }
    @Test void aLaterRevisionStartsItsNoticeAndIsAnnouncedOnceToThoseWhoAcceptedTheEarlierOne() {
        var first = repository.version(FIRST_VERSION, "es");
        assertThat(repository.revisionChangedAt(first)).as("the first revision").isEmpty();
        String hash = "c".repeat(64);
        jdbc.update("INSERT INTO legal_documents(document_type,version,acceptance_revision,locale,content_hash,title,summary,sections,published_at)"
                + " VALUES ('terms','2030-01-01.1','terms-test','es',?,'T','S','[]'::jsonb, CURRENT_TIMESTAMP + INTERVAL '1 hour')", hash);
        var second = repository.version("2030-01-01.1", "es");
        assertThat(repository.revisionChangedAt(second)).isPresent();

        UUID told = account();
        accept(told, first.version(), first.acceptanceRevision(), first.contentHash());
        UUID alreadyAccepted = account();
        accept(alreadyAccepted, first.version(), first.acceptanceRevision(), first.contentHash());
        accept(alreadyAccepted, "2030-01-01.1", "terms-test", hash);
        UUID neverAccepted = account();
        UUID inactive = account();
        accept(inactive, first.version(), first.acceptanceRevision(), first.contentHash());
        jdbc.update("UPDATE users SET active = false WHERE id = ?", inactive);
        UUID suspended = account();
        accept(suspended, first.version(), first.acceptanceRevision(), first.contentHash());
        jdbc.update("UPDATE users SET locked = true WHERE id = ?", suspended);

        assertThat(repository.latestAcceptanceOfOtherRevision(told, "terms-test")).isPresent();
        assertThat(repository.latestAcceptanceOfOtherRevision(neverAccepted, "terms-test")).isEmpty();
        assertThat(announcements.nextRecipients("terms-test", 1)).containsExactly(told);
        assertThat(announcements.nextRecipients("terms-test", 1)).as("the cursor moved past them").isEmpty();
        UUID late = account();
        accept(late, first.version(), first.acceptanceRevision(), first.contentHash());
        assertThat(announcements.nextRecipients("terms-test", 1)).as("the announcement is complete").isEmpty();
    }
    private static Section transactions(TermsDocument document) {
        return document.sections().stream().filter(section -> "transactions".equals(section.id())).findFirst().orElseThrow();
    }
    /** The documented algorithm: compact UTF-8 JSON of title, summary and sections (id, title, body), in that order. */
    private static String contentHash(TermsDocument document) throws Exception {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", document.title());
        payload.put("summary", document.summary());
        payload.put("sections", document.sections().stream().map(section -> {
            var json = new LinkedHashMap<String, String>();
            json.put("id", section.id());
            json.put("title", section.title());
            json.put("body", section.body());
            return json;
        }).toList());
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(new ObjectMapper().writeValueAsBytes(payload)));
    }
    private void accept(UUID user, String version, String revision, String hash) {
        jdbc.update("INSERT INTO user_legal_acceptances(user_id,document_type,acceptance_revision,document_version,locale,content_hash)"
                + " VALUES (?,'terms',?,?,'es',?)", user, revision, version, hash);
    }
}
