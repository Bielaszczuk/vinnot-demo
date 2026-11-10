package com.vinnot.legal.infrastructure;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.legal.application.port.out.LegalDocumentPort;
import com.vinnot.legal.application.port.out.LegalAcceptancePort;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tools.jackson.core.JacksonException;

@Repository
public class JdbcLegalRepository implements LegalDocumentPort, LegalAcceptancePort {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final String currentVersion;
    private final boolean enforce;
    public JdbcLegalRepository(JdbcTemplate jdbc, ObjectMapper mapper,
            @Value("${app.legal.terms-version:2026-10-29.1}") String currentVersion,
            @Value("${app.legal.enforce-acceptance:false}") boolean enforce) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.currentVersion = currentVersion;
        this.enforce = enforce;
    }
    @Override public boolean enforcementEnabled() { return enforce; }
    @Override public TermsDocument current(String locale) { return version(currentVersion, locale); }
    @Override public TermsDocument version(String version, String locale) {
        var rows = jdbc.query("""
                SELECT version, acceptance_revision, locale, content_hash, title, summary, sections::text
                FROM legal_documents WHERE document_type = 'terms' AND version = ? AND locale = ?
                """, (rs, row) -> {
                    try {
                        return new TermsDocument(rs.getString("version"), rs.getString("acceptance_revision"),
                                rs.getString("locale"), rs.getString("content_hash"),
                                rs.getString("title"), rs.getString("summary"), mapper.readValue(rs.getString("sections"),
                                    new TypeReference<List<TermsDocument.Section>>() { }));
                    } catch (JacksonException exception) {
                        throw new IllegalStateException("Invalid archived legal document", exception);
                    }
                }, version, locale);
        return rows.stream().findFirst().orElseThrow(() -> new EntityNotFoundException("Terms", version));
    }
    @Override public Optional<Instant> revisionChangedAt(TermsDocument document) {
        return jdbc.query("""
                SELECT min(d.published_at) FROM legal_documents d
                WHERE d.document_type = 'terms' AND d.acceptance_revision = ?
                  AND EXISTS (SELECT 1 FROM legal_documents e WHERE e.document_type = 'terms'
                              AND e.acceptance_revision <> d.acceptance_revision AND e.published_at < d.published_at)
                """, (rs, row) -> rs.getTimestamp(1), document.acceptanceRevision()).stream()
                .filter(Objects::nonNull).map(Timestamp::toInstant).findFirst();
    }
    @Override public Optional<Instant> latestAcceptanceOfOtherRevision(UUID userId, String revision) {
        return jdbc.query("""
                SELECT max(accepted_at) FROM user_legal_acceptances
                WHERE user_id = ? AND document_type = 'terms' AND acceptance_revision <> ?
                """, (rs, row) -> rs.getTimestamp(1), userId, revision).stream()
                .filter(Objects::nonNull).map(Timestamp::toInstant).findFirst();
    }
    @Override public Optional<Instant> acceptedAt(UUID userId, String revision) {
        return jdbc.query("""
                SELECT accepted_at FROM user_legal_acceptances
                WHERE user_id = ? AND document_type = 'terms' AND acceptance_revision = ?
                """, (rs, row) -> rs.getTimestamp(1).toInstant(), userId, revision).stream().findFirst();
    }
    @Override public void accept(UUID userId, TermsDocument document) {
        jdbc.update("""
                INSERT INTO user_legal_acceptances
                    (user_id, document_type, acceptance_revision, document_version, locale, content_hash)
                VALUES (?, 'terms', ?, ?, ?, ?) ON CONFLICT (user_id, document_type, acceptance_revision) DO NOTHING
                """, userId, document.acceptanceRevision(), document.version(), document.locale(), document.contentHash());
    }
}
