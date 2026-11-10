package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code social_publications} table (#510). {@link #claim} and {@link #saveIfStatus} are one conditional update each,
 * so only one worker moves a queued publication to publishing and only one retry moves a failed one back to queued.
 */
@Component
public class JdbcSocialPublicationRepository implements SocialPublicationRepository {
    private static final String COLUMNS = """
            id, post_id, network, status, external_id, permalink, attempts, error, created_at, updated_at, published_at
            """;
    private final JdbcTemplate jdbc;

    public JdbcSocialPublicationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void save(SocialPublication publication) {
        jdbc.update("""
                INSERT INTO social_publications (id, post_id, network, status, external_id, permalink, attempts, error, created_at,
                    updated_at, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, external_id = EXCLUDED.external_id,
                    permalink = EXCLUDED.permalink, attempts = EXCLUDED.attempts, error = EXCLUDED.error,
                    updated_at = EXCLUDED.updated_at, published_at = EXCLUDED.published_at
                """, publication.id(), publication.postId(), publication.network().name(), publication.status().name(),
                publication.externalId(), publication.permalink(), publication.attempts(), publication.error(),
                Timestamp.from(publication.createdAt()), Timestamp.from(publication.updatedAt()), timestamp(publication.publishedAt()));
    }

    @Override
    public boolean saveIfStatus(SocialPublication publication, PublicationStatus expected) {
        return jdbc.update("""
                UPDATE social_publications SET status = ?, external_id = ?, permalink = ?, attempts = ?, error = ?, updated_at = ?,
                    published_at = ?
                WHERE id = ? AND status = ?
                """, publication.status().name(), publication.externalId(), publication.permalink(), publication.attempts(),
                publication.error(), Timestamp.from(publication.updatedAt()), timestamp(publication.publishedAt()), publication.id(),
                expected.name()) == 1;
    }

    @Override
    public Optional<SocialPublication> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM social_publications WHERE id = ?", JdbcSocialPublicationRepository::publication, id)
                .stream().findFirst();
    }

    @Override
    public List<SocialPublication> findByPost(UUID postId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM social_publications WHERE post_id = ?", JdbcSocialPublicationRepository::publication,
                postId).stream().sorted(Comparator.comparing(SocialPublication::network)).toList();
    }

    @Override
    public boolean claim(UUID id, Instant now) {
        return jdbc.update("""
                UPDATE social_publications SET status = 'PUBLISHING', attempts = attempts + 1, updated_at = ?
                WHERE id = ? AND status = 'QUEUED'
                """, Timestamp.from(now), id) == 1;
    }

    @Override
    public List<SocialPublication> findSucceededSince(Instant since) {
        return jdbc.query("SELECT " + COLUMNS + """
                 FROM social_publications WHERE published_at >= ? AND status IN ('PUBLISHED', 'DRAFT_SENT') AND external_id IS NOT NULL
                 ORDER BY published_at
                """, JdbcSocialPublicationRepository::publication, Timestamp.from(since));
    }

    /** Drafts keep {@code published_at} as the moment they were sent, the column the window reads (indexed since V82). */
    @Override
    public List<SocialPublication> findDraftsSentSince(Instant since, int limit) {
        return jdbc.query("SELECT " + COLUMNS + """
                 FROM social_publications WHERE status = 'DRAFT_SENT' AND published_at >= ? AND external_id IS NOT NULL
                 ORDER BY published_at, id LIMIT ?
                """, JdbcSocialPublicationRepository::publication, Timestamp.from(since), limit);
    }

    private static SocialPublication publication(ResultSet row, int index) throws SQLException {
        Timestamp publishedAt = row.getTimestamp("published_at");
        return SocialPublication.restore(row.getObject("id", UUID.class), row.getObject("post_id", UUID.class),
                SocialNetwork.valueOf(row.getString("network")), PublicationStatus.valueOf(row.getString("status")),
                row.getString("external_id"), row.getString("permalink"), row.getInt("attempts"), row.getString("error"),
                row.getTimestamp("created_at").toInstant(), row.getTimestamp("updated_at").toInstant(),
                Objects.isNull(publishedAt) ? null : publishedAt.toInstant());
    }

    private static Timestamp timestamp(Instant value) {
        return Objects.isNull(value) ? null : Timestamp.from(value);
    }
}
